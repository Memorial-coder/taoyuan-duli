# 前端 UI / UX 审查报告

日期：2026-04-24

范围：
- 审查对象：`taoyuan-main` 前端
- 关注点：排版层级、信息密度、交互路径、移动端可用性、可访问性、测试证据
- 审查方式：`ux-review` + `smoke-check` + `test-evidence-review` + `consistency-check` + `team-polish`

## 本次结论

当前前端已经恢复到可构建、可 type-check、可 lint 的状态，但核心页面仍存在明显的“信息过密、入口过深、交互语义不一致”问题。整体不是“不能用”，而是“能玩但需要更强的分层与减压”，尤其在商店、任务、钱包、瀚海、村庄建设这几类后期页面上更明显。

## 本次验证证据

已执行：
- `npm --prefix taoyuan-main run check`：通过，仅 4 条类型导入 warning
- `npm --prefix taoyuan-main run build`：通过，但产物有超大 chunk 警告
- 基于本机 `Edge 147.0.3912.72` 的真实页面烟测：已走通 `主菜单 -> 新建旅程 -> 农场 -> 商店 -> 任务 -> 钱包 -> 手机视口`

未通过：
- `npm --prefix taoyuan-main run qa:late-game-samples`：失败，`sampleSaves.ts` 依赖的 `./regions` 模块解析断链

未执行成功：
- 浏览器自动化烟测：本地 Playwright 包存在，但浏览器内核未安装；本次未继续下载额外运行时

烟测产物：
- 截图目录：[ui-smoke-2026-04-24](</D:/taoyuan-latest/taoyuan-duli/docs/ui-smoke-2026-04-24>)
- 摘要 JSON：[summary.json](</D:/taoyuan-latest/taoyuan-duli/docs/ui-smoke-2026-04-24/summary.json>)

## 关键发现

### P1. 核心页面把“说明面板”放在“主要动作”前面，行动入口被埋得太深

表现：
- 商店页在真正可购物货架前，先叠了经济看板、市场看板、目录总览、推荐货架等多层摘要
- 任务页在主线、委托、特殊订单前，先叠了经营提示和村庄建设线路
- 钱包页把被动、预算、票券、额度兑换、流派系统串在同一长页里
- 瀚海页的顶部也先显示跨系统联动，再进入具体玩法

证据：
- [taoyuan-main/src/views/game/ShopView.vue:410]
- [taoyuan-main/src/views/game/QuestView.vue:15]
- [taoyuan-main/src/views/game/QuestView.vue:140]
- [taoyuan-main/src/views/game/WalletView.vue:133]
- [taoyuan-main/src/views/game/HanhaiView.vue:99]

建议：
- 每页首屏只保留 1 个主摘要 + 1 个主动作区
- 运营分析、推荐理由、跨系统提示默认折叠，改成“展开更多”
- 把“看板页”和“执行页”拆层，而不是全部并列堆叠

真实烟测补充：
- 在 `1440x960` 和 `390x844` 两种视口下，`Farm / Shop / Quest / Wallet` 的首屏文本预览都先被 `StatusBar + TopGoalsPanel` 吃掉，页面自身内容明显靠后
- 这说明问题不只是静态代码层面的“看起来很多”，而是运行态下首屏确实先看到全局经营摘要，再看到本页主体

### P1. 正文级内容大量使用 `10px/11px`，阅读负担偏高

统计抽样：
- `ShopView.vue`：`text-xs` / `text-[10px]` / `text-[11px]` 共 197 处
- `BreedingView.vue`：158 处
- `QuestView.vue`：146 处
- `NpcView.vue`：131 处
- `WalletView.vue`：119 处
- `HanhaiView.vue`：91 处

证据：
- [taoyuan-main/src/views/game/ShopView.vue:61]
- [taoyuan-main/src/views/game/QuestView.vue:24]
- [taoyuan-main/src/views/game/VillageView.vue:98]
- [taoyuan-main/src/views/game/WalletView.vue:100]
- [taoyuan-main/src/views/game/HanhaiView.vue:85]
- [taoyuan-main/src/components/game/TopGoalsPanel.vue:41]
- [taoyuan-main/src/app.css:175]
- [taoyuan-main/src/app.css:187]

建议：
- 正文说明文字最低提升到 `12px`
- `10px` 只保留给角标、状态码、次级计数
- 同类提示文案合并，避免“标题 + 说明 + 提示 + 理由 + 限制”五层同屏

### P1. 大量整块卡片依赖 `cursor-pointer + @click`，交互语义与键盘可达性不足

表现：
- 商店、任务、仓储、角色等页存在大量整块可点击卡片，但并非语义按钮/链接
- 全局按钮样式定义了 `hover/active/disabled`，但没有统一的 `focus-visible` 反馈

证据：
- [taoyuan-main/src/views/game/ShopView.vue:216]
- [taoyuan-main/src/views/game/ShopView.vue:246]
- [taoyuan-main/src/views/game/ShopView.vue:318]
- [taoyuan-main/src/views/game/ShopView.vue:427]
- [taoyuan-main/src/views/game/QuestView.vue:149]
- [taoyuan-main/src/views/game/QuestView.vue:185]
- [taoyuan-main/src/views/game/QuestView.vue:222]
- [taoyuan-main/src/views/GameLayout.vue:180]
- [taoyuan-main/src/views/GameLayout.vue:267]
- [taoyuan-main/src/app.css:115]
- [taoyuan-main/src/app.css:137]
- [taoyuan-main/src/app.css:141]

建议：
- 任何“整块卡片点击进入详情”的元素统一改成 `button` 或 `router-link`
- 为 `.btn` 和卡片型交互增加 `:focus-visible`
- 对卡片内次级操作避免“整行点击 + 内部再点按钮”的事件冲突结构

新增证据：
- [taoyuan-main/src/components/game/Button.vue:12] 没有透传 `$attrs`

附带影响：
- 传给 `Button` 组件的 `data-testid`、`aria-label`、`title`、`type` 等属性在最终 DOM 中会丢失
- 这不仅影响自动化测试，也会进一步放大可访问性问题

### P1. 移动端快捷入口只有图标，没有足够的标签与焦点提示

表现：
- 游戏主布局右下角快捷按钮只有图标
- 地图菜单关闭按钮只有 `X` 图标
- 我在这些核心组件里没有检出 `aria-label`
- `mobile-setting-btn` 甚至没有和其他浮动按钮共用 hover/active 样式

证据：
- [taoyuan-main/src/views/GameLayout.vue:32]
- [taoyuan-main/src/views/GameLayout.vue:35]
- [taoyuan-main/src/views/GameLayout.vue:38]
- [taoyuan-main/src/views/GameLayout.vue:42]
- [taoyuan-main/src/views/GameLayout.vue:45]
- [taoyuan-main/src/components/game/MobileMapMenu.vue:4]
- [taoyuan-main/src/components/game/StatusBar.vue:15]
- [taoyuan-main/src/views/GameLayout.vue:1057]

建议：
- 给浮动按钮补 `aria-label`
- 至少对邮件 / 设置 / 日志提供文字气泡或长按提示
- 统一 `mobile-setting-btn` 的交互态样式
- 优先把“保存并返回”收进菜单，不要和状态栏常驻抢空间

### P2. 钱包、瀚海、百科属于“大而全”页面，需要拆层

表现：
- 钱包页同时承载预算、商店推荐、票券、额度兑换、流派成长
- 瀚海页同时承载解锁、商路、合同、套组、赌坊、联动建议
- 百科页是超长线性手册，虽然索引完整，但更像文档，不像可快速检索的游戏内帮助

证据：
- [taoyuan-main/src/views/game/WalletView.vue:133]
- [taoyuan-main/src/views/game/WalletView.vue:194]
- [taoyuan-main/src/views/game/WalletView.vue:247]
- [taoyuan-main/src/views/game/WalletView.vue:318]
- [taoyuan-main/src/views/game/HanhaiView.vue:64]
- [taoyuan-main/src/views/game/HanhaiView.vue:99]
- [taoyuan-main/src/views/game/HanhaiView.vue:281]
- [taoyuan-main/src/views/GuideBookView.vue:36]
- [taoyuan-main/src/components/game/GuideBookManual.vue:2]
- [taoyuan-main/src/components/game/GuideBookManual.vue:928]

建议：
- 钱包页拆成“预算 / 票券 / 额度 / 流派”四个签
- 瀚海页拆成“经营 / 遗迹 / 赌坊 / 联动建议”
- 百科增加关键词过滤、折叠目录和“最近查看”

### P2. 构建已恢复，但前端性能仍有明显优化空间

证据：
- 当前路由已经使用动态导入，见 [taoyuan-main/src/router/index.ts:20]
- 但构建产物仍给出大 chunk 警告，`GameLayout`、`ShopView`、`NpcView`、`GuideBookView` 等页面体量明显偏大

建议：
- 拆分 `GameLayout` 中与主循环不强相关的弹窗与小游戏
- 对 `GuideBookManual`、后台页、调试页、复杂玩法页继续手工分块
- 对大列表页减少首屏渲染量，必要时引入分页或虚拟列表

### P2. 测试证据链需要刷新，不然 UI 优化很难形成稳定闭环

证据：
- 脚本定义见 [taoyuan-main/package.json:16]
- 样例脚本当前失败点见 [taoyuan-main/src/data/sampleSaves.ts:1]
- 本轮结论与旧 QA 报告已不一致：`check` / `build` 现在能过，但样例 QA 脚本过不了

建议：
- 先修复 `qa:late-game-samples`
- 增加最小 UI 烟测：主菜单、引导页、商店、任务、设置
- 补一套“页面首屏不崩 + 主按钮可点 + 关键模态可开”的浏览器自动化基线

## 已有优点

- 路由级按页动态导入已经在做，方向是对的
- `TopGoalsPanel` 默认折叠是好的减压策略，说明项目已经有“渐进展示”意识
- `ShopView`、`QuestView`、`WalletView` 等页都有较强的经营上下文提示，说明系统间联动不是缺失，而是需要重新分层

## 建议的下一步顺序

1. 先做一轮“排版降噪”：
   - 正文最小字号提到 `12px`
   - 同类提示合并
   - 让首屏主动作更靠前
2. 再做一轮“交互语义修正”：
   - 卡片改语义按钮
   - 补 `focus-visible`
   - 给图标按钮补标签
3. 最后做“结构拆层”：
   - 钱包、瀚海、百科拆签或折叠
   - 商店和任务把运营看板下沉为二级信息

## 结论

当前 UI 不是“重做型问题”，而是典型的“内容继续变多，但分层没有同步升级”。最值得优先做的不是换皮，而是减轻首屏密度、统一交互语义、把说明层从执行层上方挪开。只要先把这三件事做好，整体体验会立刻更顺。
