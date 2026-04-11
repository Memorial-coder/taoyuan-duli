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

## 备注
- `pnpm` 在当前环境不可用，已改用 `npm run type-check` 做自检。
- 本次未直接改代码，只记录高置信问题。
