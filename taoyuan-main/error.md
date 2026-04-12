# 项目审查记录（2026-04-11）

本次基于当前 `taoyuan-main` 代码做静态审查，只记录高置信问题；未修改业务代码。

补充结论：当前在本地执行 `npm run type-check` 可以通过，因此旧报告里“type-check 不通过”的结论已不适用于当前快照。

## 1. 主题周实际上不会按“周”轮换，`late_sink_rotation` 永远不可达
- 严重度：高
- 位置：`src/data/goals.ts:408-527`，`src/stores/useGoalStore.ts:1419-1431`
- 问题：主题周定义里秋季有两套主题（`autumn_processing`、`late_sink_rotation`），但 `getThemeWeekBySeason()` 只按 season 取第一条匹配项。
- 结果：同一季内不会真正按周轮换，秋季新增的“豪华经营周”会被前面的“秋收加工周”永久遮蔽。
- 复现：连续推进多个秋季周，观察 `goalStore.currentThemeWeek`，只会命中第一条秋季主题。
- 影响：中后期主题经营、推荐货架、相关订单偏好和日志提示都会偏离设计预期。

## 2. 日经济快照在写入后才补高价值订单标签，循环多样度统计失真
- 严重度：高
- 位置：`src/composables/useEndDay.ts:1235-1247`，`src/composables/useEndDay.ts:1280-1289`，`src/stores/usePlayerStore.ts:328-336`
- 问题：`appendEconomySnapshot()` 写入 `highValueOrderTypes` 时，当前主题周偏好、特殊订单 `themeTag`、进行中高价值订单标签尚未加入集合。
- 结果：快照中的 `highValueOrderTypes` 偏小，`getLoopDiversityScore()` 会低估循环多样度。
- 复现：保留一个特殊订单或带主题偏好的经营周，睡到第二天后查看最新 `recentSnapshots` 中的 `highValueOrderTypes`。
- 影响：后期经济观测、风险报告、推荐逻辑都会被错误数据喂养。

## 3. 跨周归档会漏掉上一周最后一天的经济数据
- 严重度：高
- 位置：`src/composables/useEndDay.ts:1188-1250`，`src/stores/useGoalStore.ts:1229-1233`
- 问题：日结在 `nextDay()` 之后才生成 `economyDayTag` 并写入日快照；而周归档又会过滤掉 `dayTag === generatedAtDayTag` 的快照。
- 结果：这条“实际代表上一天收入/支出”的快照会在跨周时被排除，导致上一周最后一天漏算。
- 复现：在周末最后一天完成大量买卖后睡觉，触发跨周；比较周快照与实际最后一天流水。
- 影响：周收入、周支出、净收入、资金池消耗都会偏小，后期周报不可靠。

## 4. 村庄建设完工支出没有按 `villageProject` / sink 口径记账
- 严重度：高
- 位置：`src/stores/useVillageProjectStore.ts:952-961`，`src/stores/usePlayerStore.ts:277-289`
- 问题：建设完工时调用的是 `playerStore.spendMoney(project.moneyCost)`，未传 `villageProject` 系统标识，也未调用 `recordSinkSpend()`。
- 结果：建设花费会落入默认 `system`，而不是村庄建设/资金池消费口径。
- 复现：完成任意一个村庄项目后查看经济统计。
- 影响：村庄建设作为重要资金去向时，经济治理看板会明显失真。

## 5. 直接卖店收入未记入 `shop` 系统，和出货箱统计口径不一致
- 严重度：中
- 位置：`src/stores/useShopStore.ts:2084-2087`，`src/stores/usePlayerStore.ts:450-456`，对照 `src/composables/useEndDay.ts:833-836`
- 问题：`sellItem()` 里直接调用 `playerStore.earnMoney(totalPrice)`，没有传 `system: 'shop'`；但出货箱结算链路是单独按商店/市场系统统计的。
- 结果：同样是卖货，直接卖店与出货箱会分散到不同统计桶。
- 复现：分别进行直接卖店和出货箱出售，再查看按系统统计的收入分布。
- 影响：收入结构、主导收入来源、后期风险提示会被拆散，分析口径不统一。

## 6. “为你推荐”可能推荐已拥有或未解锁商品
- 严重度：中
- 位置：`src/stores/useShopStore.ts:242-299`，`src/views/game/ShopView.vue:316-345`，对照 `src/views/game/ShopView.vue:367-395`
- 问题：`recommendedCatalogOffers` 只做打分排序，没有过滤：
  - `onceOnly && isCatalogOwned(offer.id)` 的已拥有商品
  - `!isCatalogOfferUnlocked(offer.id)` 的未解锁商品
- 结果：推荐区可能展示当前不可购买的内容，而常规货架区反而有“已拥有 / 图鉴未解锁”提示。
- 复现：先拥有一次性商品，或让图鉴发现数不足，再打开“为你推荐”。
- 影响：推荐区语义与“当前可买推荐”不一致，容易误导玩家点击无效商品。

## 7. WebDAV 下载校验不完整，可能把“可解密但结构非法”的坏档写入本地槽位
- 严重度：中
- 位置：`src/composables/useWebdav.ts:387-400`，对照 `src/stores/useSaveStore.ts:741-743`、`src/stores/useSaveStore.ts:787-789`
- 问题：WebDAV 下载只检查 `parseSaveData(res.data)`，即“能解密成 JSON”；但本地导入/加载还会额外检查 `normalizeSaveEnvelope(data)`。
- 结果：云端下载链路允许把结构不完整的伪存档写入本地槽位，之后加载才失败。
- 复现：在云端放入一个能解密、但缺失必要 envelope 结构的存档文本并下载到本地槽位。
- 影响：会制造“下载成功但无法读取”的坏档，破坏用户对云存档可靠性的预期。

## 8. “保存并返回”存在开放跳转风险
- 严重度：中
- 位置：`src/components/game/StatusBar.vue:104-121`，`src/views/GameLayout.vue:557-560`，`src/components/game/SaveManager.vue:207-210`
- 问题：`returnUrl` 来自 `/api/public-config` 返回值，前端未做同源/白名单校验，保存成功后直接赋给 `window.location.href`。
- 复现：让 `taoyuan_return_button_url` 指向外部站点，然后点击“保存并返回”。
- 影响：一旦配置错误或被恶意篡改，用户会被直接带离当前站点，属于明显的跳转面风险。

## 9. 敏感信息明文存放在 `localStorage`
- 严重度：中
- 位置：
  - WebDAV：`src/composables/useWebdav.ts:29-35`，`src/composables/useWebdav.ts:45-48`，`src/composables/useWebdav.ts:176-178`
  - 管理员令牌：`src/utils/taoyuanAiApi.ts:19-22`，`src/utils/taoyuanAiApi.ts:28-32`，`src/utils/taoyuanAiApi.ts:199-203`
- 问题：
  - WebDAV 配置整体序列化进 `localStorage`，其中包含明文用户名/密码。
  - AI 管理后台令牌 `admin_token` 也直接存放在 `localStorage` 并反复取出发请求头。
- 影响：只要页面出现任意脚本注入、第三方脚本失控、浏览器扩展越权或共用设备泄露，这些敏感信息都容易被直接读取。
- 备注：这更偏安全设计缺陷，不是立即触发的玩法 bug，但确实属于高价值敏感信息暴露面。

## 10. 目标奖励在背包满时会被折现，但日志仍写成“拿到了物品”
- 严重度：中
- 位置：`src/stores/useGoalStore.ts:1491-1540`
- 问题：`grantReward()` 在背包放不下 `reward.items` 时，会把整包物品按卖价折算成铜钱；但后续 `rewardTexts` 仍然无条件把原物品列表拼进达成日志。
- 结果：日志会同时出现“背包已满，部分目标奖励自动折算为X文”和“获得：物品A×n、物品B×n”，看起来像既拿到了钱又拿到了物品。
- 复现：把背包装满后完成一个带物品奖励的目标，查看目标达成日志。
- 影响：奖励反馈与实际到账内容不一致，容易误导玩家判断收益。

## 11. 服务合同到期/自动续费存在 1 天边界偏差
- 严重度：中
- 位置：`src/stores/useShopStore.ts:314-319`，`src/stores/useShopStore.ts:485-505`，`src/stores/useShopStore.ts:570-579`
- 问题：周合同购买时把 `expiresDayKey` 设为“当前日 + 7”，但到期判断条件是 `currentAbsoluteDay > expiresAbsoluteDay`，不是 `>=`。
- 结果：合同在标记的到期日当天仍保持 `active`，真正过期/自动续费会延后一整天处理。
- 复现：购买一个 weekly service contract，记录 `expiresDayKey`，推进到该日后检查状态；要到次日才会过期或触发自动续费。
- 影响：合同实际生效天数比文义多 1 天，续费时点也会晚 1 天，和玩家对“到期日”的理解不一致。

## 备注
- 本次只做静态审查，没有修改业务代码。
- 若后续需要，我可以继续把这些问题按“玩法/经济/安全/存档”四类再整理成优先级清单。