# 错误审查记录（2026-04-11）

基于 `taoyuan-main/CHANGELOG.md` 中 2026-04-10 ~ 2026-04-11 的新增/变更功能进行审查，当前确认到以下问题：

## 1. type-check 当前无法通过
- 位置：`src/views/game/ShopView.vue:1654`
- 问题：声明了 `sellUnitPrice`，但未被使用。
- 现象：执行 `npm run type-check` 直接失败。
- 复现：
  1. 在 `taoyuan-main` 目录执行 `npm run type-check`
  2. 会报错：`TS6133: 'sellUnitPrice' is declared but its value is never read.`
- 影响：changelog 里多次标注“已通过 type-check / build”，但当前分支实际上不能通过类型检查。

## 2. 任务页会把非育种特殊订单错误标成“育种订单”
- 位置：`src/views/game/QuestView.vue:117-118`
- 关联数据来源：`src/stores/useQuestStore.ts:622`
- 问题：这里用的是 `v-if="questStore.specialOrder.themeTag"`，只要有 `themeTag` 就显示“育种订单”。
- 但 `themeTag` 允许值不只有 `breeding`，还包括 `fishpond`。
- 复现：
  1. 生成一个 `themeTag = 'fishpond'` 的特殊订单
  2. 打开任务页
  3. 卡片仍会显示“育种订单”标签
- 影响：订单语义显示错误，和 changelog 中“展示语义修正 / 经营提醒筛选修正”的目标不一致。

## 3. QuestView 缺少 changelog 宣称的“本周重点目标”展示
- changelog 对应：`CHANGELOG.md:378`
- 已实现位置：`src/components/game/TopGoalsPanel.vue:77-92`
- 缺失位置：`src/views/game/QuestView.vue:9-38`
- 问题：changelog 写明“本周重点目标”会同步展示在 `TopGoalsPanel` 与 `QuestView`，但 `QuestView` 目前只展示：
  - 主题周信息
  - 特殊订单风向
  - 每日目标列表
- 没有任何 `goalStore.currentThemeWeekGoals` 的展示逻辑。
- 影响：任务页功能与 changelog 描述不一致，属于功能漏接。

## 4. “为你推荐”可能推荐已拥有或未解锁的商品
- 位置：`src/stores/useShopStore.ts:68-110`
- 展示位置：`src/views/game/ShopView.vue:179-206`
- 问题：`recommendedCatalogOffers` 直接从 `availableCatalogOffers` 打分筛选，没有排除：
  - `onceOnly && isCatalogOwned(offer.id)` 的已拥有商品
  - `!isCatalogOfferUnlocked(offer.id)` 的未解锁商品
- 复现：
  1. 拥有一个一次性目录商品，或图鉴发现数不足以解锁部分商品
  2. 打开万物铺“为你推荐”
  3. 仍可能看到已拥有/未解锁商品出现在推荐区
- 影响：推荐区会出现当前无法购买的商品，和“为你推荐”的实际可买预期不一致，也会造成误导。

## 5. 切换钱包流派会无确认清空已解锁节点进度
- 位置：`src/stores/useWalletStore.ts:259-264`
- 触发入口：`src/views/game/WalletView.vue:132-150`
- 问题：`selectArchetype()` 在切到其他流派时会直接把 `unlockedNodeIds` 置空，但界面上只是普通点击切换，没有任何二次确认。
- 复现：
  1. 选择任意钱包流派并解锁至少 1 个节点
  2. 点击另一个已解锁流派卡片
  3. 原流派节点进度会被立即清空
- 影响：这是隐式的破坏性操作；同页面对“重置流派”反而有确认弹窗，当前行为和 UI 预期不一致。

## 6. 厨师帽解锁条件实现错了：按总烹饪次数，不是“不同食谱”
- 文案位置：`src/data/wallet.ts:34-38`
- 实现位置：`src/stores/useWalletStore.ts:225-229`
- 问题：文案要求“烹饪10道不同的食谱”，但代码判断的是 `achievementStore.stats.totalRecipesCooked >= 10`。
- 复现：
  1. 重复做同一道菜 10 次
  2. 仍会解锁 `chefs_hat`
- 影响：实际解锁门槛低于文案与设计描述，属于功能规则错误。

## 7. 主题周实际上按季节固定，不会按“周”轮换
- 定义位置：`src/data/goals.ts:408-528`
- 选择逻辑：`src/data/goals.ts:526-527`
- 使用位置：`src/stores/useGoalStore.ts:1206-1218`, `src/stores/useGoalStore.ts:1461-1470`
- 问题：`getThemeWeekBySeason()` 只按 season 取第一条匹配项，导致同一季内不会真正轮换主题周。
- 明显后果：秋季新增的 `late_sink_rotation`（豪华经营周）永远会被前面的 `autumn_processing` 抢先匹配，实际上不可达。
- 复现：
  1. 在秋季内连续推进多个周
  2. 主题周始终是 `autumn_processing`
  3. `late_sink_rotation` 不会出现
- 影响：changelog 中“本周主题展示 / 周更联动 / 豪华经营周进入编排池”等描述被部分架空。

## 8. 百科只做了搜索和分类，没有实现 changelog 宣称的排序能力
- 位置：`src/components/game/GlossaryTab.vue:1-80`
- 问题：当前百科页只有搜索框与分类筛选，没有排序控件，也没有任何排序逻辑。
- 影响：如果 changelog 把“图鉴百科体验增强”的“搜索/筛选/排序”理解为百科页能力，则该功能只实现了一部分。
- 备注：图鉴列表排序是有的，但百科页本身没有排序。

## 9. 日结先归档经济快照、后写主题周/特殊订单标签，导致 highValueOrderTypes 统计失真
- 快照归档位置：`src/composables/useEndDay.ts:1174-1186`
- 标签写入位置：`src/composables/useEndDay.ts:1206-1215`
- 问题：当前日结流程先写入经济日快照，再补 active theme week / special order 的高价值标签。
- 结果：`highValueOrderTypes` 往往少记，甚至保持为 `0`，WS01 的循环多样度与风险报告会漏掉 changelog 声称已接入的信号。
- 复现：
  1. 保持一个进行中的特殊订单，或处于带经营标签的主题周
  2. 睡到第二天触发日结
  3. 查看 `playerStore.economyTelemetry.recentSnapshots.at(-1).highValueOrderTypes`
  4. 会发现没有包含当前订单/主题周标签
- 影响：经济观测与风险提示对“高价值订单/主题周经营”的识别不准确。

## 10. 村庄建设花费没有记到 village/construction 遥测里
- 扣钱位置：`src/stores/useVillageProjectStore.ts:799-807`
- 遥测记账参考：`src/stores/usePlayerStore.ts:265-278`
- 快照消费来源：`src/composables/useEndDay.ts:1164-1185`
- 问题：村庄建设完成时调用的是 `playerStore.spendMoney(project.moneyCost)`，没有带村庄建设系统标识，也没有调用 `recordSinkSpend`。
- 结果：支出会落到默认的 `system` 桶，而不是 `villageProject` / construction 类支出。
- 复现：
  1. 完成任意一个村庄建设项目
  2. 结束当天
  3. 检查最新经济快照或钱袋经济观测
  4. 会发现 `expenseBySystem.villageProject` 为空，`sinkSpend` 也不会对应增加
- 影响：WS02 / 经济治理里“建设是重要资金池”的数据口径失真。

## 11. 瀚海消费没有独立 telemetry 桶，全部混入 system
- 类型定义位置：`src/types/goal.ts:137-139`, `src/types/economy.ts:92-95`
- 实际花费位置示例：`src/stores/useHanhaiStore.ts:123-129`, `src/stores/useHanhaiStore.ts:161-178`, `src/stores/useHanhaiStore.ts:202-216`
- 问题：`EconomySystemKey` 里没有 `hanhai`，而瀚海相关解锁/商店/遗迹花费也都走默认通用扣钱路径。
- 结果：瀚海消费全部被记到 `system`，后期经济观测无法识别这是瀚海循环的支出。
- 复现：
  1. 进行瀚海解锁、勘探或瀚海商店购买
  2. 睡到下一天
  3. 检查最新经济快照
  4. 支出只会出现在泛用 `system`，不会以瀚海专属桶呈现
- 影响：WS08 的经济闭环对观测、推荐资金去向和风险评估基本不可见。

## 12. WS01 日经济快照的日期晚了一天，导致跨周周快照漏算周末最后一天
- 位置：`src/composables/useEndDay.ts:1169-1219`
- 位置：`src/stores/useGoalStore.ts:1021-1022`
- 问题：`handleEndDay()` 在 `nextDay()` 之后才用新一天生成 `economyDayTag` 并写入日经济快照；随后周归档又会用 `snapshot.dayTag !== generatedAtDayTag` 过滤这条刚写入的快照。
- 结果：日快照的 `dayTag` 整体会晚一天，跨周归档时还会把上一周最后一天的那条快照排除掉，导致 `totalIncome` / `totalExpense` / `netIncome` / `sinkSpend` 偏小。
- 影响：WS01 的日/周经济观测和 CORE-005 的周快照归档都会失真，和 changelog 中“跨天写日快照、跨周自动归档”的描述不一致。

## 13. 直接卖店收入没有按 shop 系统记账，和出货箱口径不一致
- 位置：`src/stores/useShopStore.ts:841-845`
- 位置：`src/composables/useEndDay.ts:833-835`
- 位置：`src/stores/usePlayerStore.ts:450`
- 问题：出货箱结算会用 `playerStore.earnMoney(shippingIncome, { system: 'shop' })` 记账，但直接卖店 `sellItem()` 仍调用 `playerStore.earnMoney(totalPrice)`，落到默认系统桶。
- 结果：直接卖店收入不会进入 `shop` 口径，WS01 的 `incomeBySystem`、`dominantIncomeShare`、风险报告会把两条出售链路统计成不同系统。
- 影响：虽然 ECON-010 已把直接卖店并入 `shippingHistory`，但经济观测链路仍与 changelog 宣称的统一出售统计不一致。

## 14. 高价值订单标签在写日快照之后才补入，循环多样度会少算
- 位置：`src/composables/useEndDay.ts:1204-1215`
- 位置：`src/composables/useEndDay.ts:1236-1245`
- 位置：`src/stores/usePlayerStore.ts:328-336`
- 问题：`appendEconomySnapshot()` 写入 `highValueOrderTypes` 时，当前主题周偏好、特殊订单 `themeTag` 和进行中的高价值订单标签还没有加入集合。
- 结果：日快照里的 `highValueOrderTypes` 经常偏小甚至为 0，`getLoopDiversityScore()` 会基于错误快照低估循环多样度。
- 影响：这和 changelog 中“主题周偏好、特殊订单与进行中的高价值订单会参与循环多样度统计”的描述不一致。

## 备注
- `pnpm` 在当前环境不可用，已改用 `npm run type-check` 做自检。
- 本次未直接改代码，只记录高置信问题。
