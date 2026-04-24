# 桃源乡 更新日志

---

## [未发布]

### 新增功能

#### 0424 行旅图主线：区域地图骨架、公开巡行与审查收口
- `src/types/region.ts`、`src/data/regions.ts`、`src/stores/useRegionMapStore.ts`、`src/views/game/RegionMapView.vue` 已新增行旅图第一阶段骨架，统一收口三地区定义、路线状态、周焦点、区域资源台账、远征运行态与基础 telemetry。
- `src/router/index.ts`、`src/composables/useNavigation.ts`、`src/data/timeConstants.ts`、`src/views/MainMenu.vue`、`src/views/dev/LateGameDebugView.vue`、`src/components/game/MobileMapMenu.vue` 已把 `region-map` 和 `frontier` 正式接入游戏路由、导航、旅行分组与样例跳转，读档后也能恢复到行旅图页。
- `src/data/systemFlags.ts`、`src/types/game.ts` 已新增 `lateGameRegionMap`、`lateGameExpeditionBoss`、`lateGameRegionalResources` 三个特性开关，并把 `region` 纳入系统开关分类。
- `src/stores/useSaveStore.ts` 已将 `regionMap` 纳入存档保存、读档回退、runtime reset / restore 链路；旧档缺失该字段时会自动回退到安全默认值。
- `src/types/goal.ts`、`src/data/goals.ts`、`src/stores/useGoalStore.ts`、`src/components/game/topGoals/useTopGoalsPanelModel.ts`、`src/composables/useEndDay.ts` 已把 `regionRouteCompletions`、`expeditionBossClears`、`regionalResourceTurnIns` 接入主题周、周计划、周结和顶部目标承接，`region-map` 现可进入现有推荐链。
- `src/stores/useGuildStore.ts`、`src/stores/useHanhaiStore.ts`、`src/stores/useMuseumStore.ts` 已开始消费当前行旅图焦点区域，老系统推荐动作不再把新区域当成外来面板。
- `src/data/items.ts` 已新增第一批区域资源实体物品：`ancient_waybill`、`archive_rubbing`、`marsh_spore_sample`、`luminous_algae`、`ley_crystal_shard`、`wind_etched_core`，并补齐来源说明。
- `src/data/sampleSaves.ts` 已新增 `region_map_showcase` 样例档，`BuiltInSampleRouteName` 也已补入 `region-map`，可直接从后期调试页跳转验证三地区、周焦点、资源台账和当前远征摘要。
- `src/views/game/RegionMapView.vue` 现在除开发态调试按钮外，已新增玩家可用的公开“巡行”动作、公开资源交付按钮与回流承接跳转按钮，行旅图从静态占位页升级为最小可玩入口。
- `src/stores/useRegionMapStore.ts` 现已支持公开 `runRouteExpedition()`：会真实消耗体力与时间、发放区域资源并写入结构化日志。
- `src/types/region.ts`、`src/data/regions.ts`、`src/stores/useRegionMapStore.ts`、`src/views/game/RegionMapView.vue` 已继续补上公开区域首领挑战：各区域首领拥有独立体力 / 时间成本，完成至少 1 条区域路线后即可触发最小首领挑战闭环。
- `src/types/region.ts`、`src/data/regions.ts`、`src/stores/useRegionMapStore.ts`、`src/views/game/RegionMapView.vue` 现已把古驿荒道 / 蜃潮泽地各自扩到 3 条节点，并补上路线前置解锁、运行时可执行性判断、路线类型/成本/提示展示，以及锁区时只给解锁向导的 handoff 摘要。
- `src/data/regions.ts`、`src/stores/useRegionMapStore.ts`、`src/data/sampleSaves.ts` 已把云岚高地扩到第 3 条节点 `cloud_highland_supply_push`，并把高地样例档同步到 3 节点版本。
- `src/views/game/ShopView.vue`、`src/views/game/FishPondView.vue`、`src/stores/useHanhaiStore.ts`、`src/stores/useMuseumStore.ts` 已把行旅图承接真正接到旧系统页：商圈和鱼塘会按“本周焦点或资源库存未清”条件显示区域承接卡；瀚海和博物馆则会基于区域资源库存与路线推进给出更具体的推荐动作。
- `src/views/game/GuildView.vue`、`src/views/game/VillageView.vue`、`src/views/game/WalletView.vue`、`src/views/game/RegionMapView.vue` 已继续把云岚高地接到旧系统页：新增高地承接卡、高地战备卡和首领准备面板，让 Guild / VillageProject / 高阶准备链可见可点。
- `src/stores/useGoalStore.ts` 已把行旅图周推荐从泛化入口提升为区域化周计划：会按当前焦点区域给 `region-map / quest / shop / hanhai / fishpond / museum / guild / village` 补充“为什么去、先准备什么、回来交给谁”的摘要，并把区域承接节点接入现有 `weeklyPlanSnapshot`。
- `src/data/sampleSaves.ts` 已把 `region_map_showcase` 补成可直接覆盖鱼塘支线的综合样例；`e2e/game-smoke.spec.ts` 也已扩展为验证 `region-map -> shop -> fishpond` 三段烟测，而不只停在行旅图首页。
- `e2e/game-smoke.spec.ts` 现已继续扩展为验证 `region-map -> shop -> fishpond -> guild -> wallet` 五段烟测，覆盖 Day 5 的高地承接面。
- `src/stores/useGoalStore.ts` 现已继续读取 `ThemeWeekDef.regionFocusRouteIds` 来生成区域周计划摘要，不再把玩家从本周高亮路线导向另一组非焦点路线；`region_expedition` 节点标签也已改成读取真实进行中的远征区域。
- `src/views/game/GuildView.vue`、`src/views/game/VillageView.vue`、`src/data/sampleSaves.ts`、`e2e/game-smoke.spec.ts` 已补齐高地链路收口：Guild -> VillageProject 跳转改为真实 `/game/village-projects`，Village 承接卡补上去钱袋出口，样例档焦点路线改为与 `late_sink_rotation` 当前配置一致，浏览器烟测也会实际点穿这条链路。
- 通过 subagent 两轮定向审查后，已收口以下问题：
  - 正式 `region-map` 页面暴露开发态强操作的问题
  - 区域资源交付只增 telemetry、不扣台账的问题
  - 子开关未真正生效的问题
  - 首领清关未校验区域解锁的问题
  - 巡行完成后残留“进行中的远征”状态的问题
  - 周焦点可能提前落到未解锁区域的问题
  - 旧系统承接卡片会因历史完成次数而常驻的问题
  - 承接卡片 CTA 只会跳回行旅图、不能继续走下游链路的问题
  - 开发态“完成并结算 / 首领清关”绕过正式可执行性校验的问题
  - 锁区 handoff 摘要过早展示后续路线与精英节点的问题
  - 旧样例档可能同时挂着 route / boss 远征态、导致当前远征语义失真的问题
  - 首领奖励家族依赖“区域第一条路线”推断、后续容易被路线顺序带偏的问题
  - 正式环境下当前远征异常残留时缺少可见收束入口的问题
  - 周计划摘要未读取 `regionFocusRouteIds`、导致路线焦点和推荐文案不一致的问题
  - 高地承接卡把已完成建设继续当作当前工作的问题
- 当前工作区验证结果：
  - `npm run type-check` 通过
  - `npm run build` 通过
  - `npm run test:e2e -- e2e/game-smoke.spec.ts` 通过
  - 公开路线巡行、公开资源交付、公开区域首领挑战三条主链均已打通
  - region-map / shop / fishpond / guild / wallet 五段承接链已有浏览器级回归覆盖

#### 0415 同性婚姻关系线收口
- `src/stores/useNpcStore.ts` 已真正放开同性可婚 NPC 的赠帕约会与求婚主链，不再被旧的“只能向异性赠帕 / 求婚”判断拦截；同时补上了“知己与婚缘互斥”的 store 侧硬校验，旧档里的同性知己若想转婚缘，必须先断缘再发展。
- `src/stores/useNpcStore.ts` 已把同性婚后的家庭扩展线从“表面文案分流”补成真实行为分流：`performPregnancyCare()` / `chooseMedicalPlan()` 现会按 `kind === 'adoption'` 切到 cloth / silk_cloth / felt 的安置用品消耗与“准备心意 / 一起走访 / 整理宅院 / 普通安置”等语义，不再继续复用孕期补品与接生文案。
- `src/views/game/NpcView.vue` 已为同性知己旧档补出可发现的迁移提示：若当前是知己关系，会在婚缘面板里明确提示“先断缘再发展婚缘”，避免按钮灰掉但不给解释。
- `src/views/game/CottageView.vue`、`src/composables/useEndDay.ts` 已补齐 adoption 视觉与日志语义：子女列表新增 `[领养]` 标签并移除 adoption 子女的 `[早产] / [健康]` 生育线标签；迎回孩子成功、阶段推进与失败日志也已走“迎一个孩子回家”的表述，不再混用孕期语义。
- `src/stores/useNpcStore.ts` 已继续补齐同性婚姻边界与持久化：婚礼倒计时完成前会再次校验同性婚姻开关、家庭提议接受时会重验 pending / 进行中状态与 adoption 开关、领养子女读档时会保留 `origin='adoption'` 标记，不再在重载后退化成亲生子女。
- `src/views/game/CottageView.vue` 已把家庭扩展按钮与可负担性提示做细：当天已完成一次家庭扩展动作后，其余操作会直接禁用；迎接方案在铜钱不足时也会提前置灰，不再让玩家点完才从日志里得知失败。
- `src/components/game/GuideBookManual.vue`、`server/src/taoyuanAiAssistant.js` 已补齐游戏内百科和 AI 助手的同性婚姻 / adoption / 知己互斥说明与关键词，减少玩家在应用内查帮助时搜不到新规则的断层。
- 本轮同性婚姻关系线收口已再次通过 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run type-check` 与 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run build` 验证。

#### 0415 管理面板整合：首页「关于游戏」可编辑 + 长期日志中心
- `src/views/TaoyuanAdminView.vue` 已从单一邮件页升级为统一桃源管理工作台，现整合 **邮件管理 / 首页关于 / 日志中心 / 用户管理** 入口；首页主菜单的“桃源管理”也已改为直达 `/admin`，不再默认跳到 `/admin/users`。
- `src/components/game/AdminHomepageAboutPanel.vue`、`src/utils/adminContentApi.ts`、`server/src/routes/api.js`、`server/src/db.js` 已新增首页“关于游戏 / 关于桃源乡”内容管理链路：管理员可在后台编辑按钮文案、弹窗标题与正文，支持 Markdown 图文混排、图片上传插入、草稿保存、正式发布、版本记录与版本恢复；其中首页关于编辑器现已改成接近交流大厅发帖体验的“文字段 / 图片段”块编辑模式，而不是单一 Markdown 文本框。
- `src/views/UserAdminView.vue`、`src/utils/adminContentApi.ts`、`src/composables/useGameLog.ts`、`server/src/routes/api.js`、`server/src/db.js` 已继续补强用户管理：列表新增“注册时间”独立列，用户详情改为弹窗查看，长期日志支持按用户的不同存档槽位分别筛选查看。
- `src/views/MainMenu.vue`、`src/utils/safeMarkdown.ts` 已把首页关于弹窗从纯文本展示改为安全 Markdown 渲染，支持标题、列表、链接与图片，且仍保留安全 URL 白名单约束。
- `server/src/db.js`、`server/src/routes/api.js`、`src/components/game/AdminLogCenterPanel.vue` 已新增内容版本日志与长期游戏日志中心；后台现在可查看首页关于内容的发布历史、版本备注，以及已持久化的游戏事件日志。
- `src/composables/useGameLog.ts` 已把关键游戏日志改为“前端保留历史 + 异步批量上报服务端”，并在页面关闭前尝试通过 `sendBeacon` 补发，支持长期保存与后台回查。
- 本轮改动已完成 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run type-check` 与 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run lint` 校验；`npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run build` 也已启动用于进一步确认构建结果。

### 修复

#### 0418 审查收口：存档未知态、活动任务约束与后台竞态补丁
- `src/stores/useSaveStore.ts` 已补齐审查里漏掉的 quest / npc 迁移字段，读档迁移不再静默丢失 `specialOrderSettlementReceipts`、`recentSpecialOrderTagHistory`、`weeklySpecialOrderState`、`householdDivision`、`familyWishBoard`、`zhijiCompanionProjects`；同时把“服务端槽位读取失败”从“空槽位”拆成单独未知态，不再允许玩家把不可验证的云槽位误当成空槽继续覆盖。
- `src/views/MainMenu.vue`、`src/components/game/MainMenuContinueList.vue`、`src/components/game/SaveManager.vue` 已把这类服务端未知槽位改成明确风险提示，并禁止在服务端槽位不可验证时继续导入到所谓“空槽”；玩家现在会看到“状态未知，等待服务端恢复后再确认”，而不是误导性的“当前没有可继续的旅程”或“空”。
- `src/stores/useQuestStore.ts`、`src/data/quests.ts` 已把限时活动窗口真正接入公告板任务生成链路，活动窗口开启后，日常委托与紧急委托会按 `activeQuestTemplateIds` 约束到当前活动池，不再只在 UI 上展示活动而实际继续刷常规池。
- `src/utils/taoyuanHallApi.ts`、`src/views/HallView.vue`、`src/utils/taoyuanAiApi.ts` 已统一修正网络异常表现：交流大厅读取 `viewer` 失败时不再直接把已登录玩家伪装成游客，AI 助手在断网或接口不可达时也不再把底层浏览器报错原样甩给玩家，而是回退成明确的中文连接失败提示。
- `src/components/game/AdminHomepageAboutPanel.vue`、`src/views/TaoyuanAdminView.vue` 已补上后台上传/竞态守卫：首页“关于游戏”内容管理在图片上传完成前不能保存或发布；桃源邮件后台则增加了列表刷新、详情补载、草稿载入和收件人搜索的请求序号保护，避免旧请求回写新界面、刷新失败把记录误清空或把草稿内容覆盖错位。
- `src/views/game/WalletView.vue` 已给额度兑换补上自动存档失败补偿：当 quota 已成功变更但当前服务端存档写回失败时，会立即把当前会话里的铜钱回滚到旧值，并强制刷新额度上下文，避免形成“额度已变、游戏钱没变”的账档分离。
- `src/stores/useWalletStore.ts` 已把流派节点进度改为按流派分别持久化：切换流派时会保留旧流派已解锁节点，切回后可直接恢复原进度，不再出现“切一次流派把整个节点树洗掉”的问题。
- `src/stores/useGameStore.ts` 已把跨区旅行的最终耗时统一到同一份速度增益口径：`getTravelCost()`、商店开门校验、真实推进时间和日志文案现在会一起吃到速度料理修正，不再出现“实际赶路变快，但入场校验和日志还按旧耗时”的错位。
- `src/stores/usePlayerStore.ts` 已把日终重置返回的 `recoveryPct` 改成真正生效的恢复比例，熬夜/昏倒结算文案不再出现“恢复 110% 体力”这类和实际体力条不一致的提示。
- `src/stores/useFishPondStore.ts`、`src/stores/useQuestStore.ts` 已把鱼塘高阶订单的结算评分接到“实际被提交的鱼”上：鱼塘交付现在会保留本次提交样本的评分/代数/健康快照，特殊订单结算会据此给出样本评分加成，而不再只按门槛文案静态打分。
- `src/components/game/AiAssistantWidget.vue` 已把快捷问题和回车发送也纳入 `isAsking` 发送锁，请求飞行中不再继续清空草稿或插入新问题，避免 AI 助手出现多条待回复同时挂起的串线状态。
- `src/views/UserAdminView.vue`、`src/views/TaoyuanAdminView.vue` 已继续补上后台旧请求守卫与错误态：用户列表切分页/筛选时现在只接受最后一次响应，切换用户时旧的游戏日志失败不会再清空当前用户日志；刷新存档信息时也会校验仍然指向同一位用户后才回写详情和提示成功；桃源邮件后台则在列表刷新、详情补载、草稿载入与收件人搜索上统一接入 request id，避免旧响应覆盖新界面，并在刷新失败时显式显示错误态而不是伪装成空列表。
- `src/stores/useProcessingStore.ts`、`src/stores/useHomeStore.ts`、`src/stores/useGoalStore.ts`、`src/stores/useVillageProjectStore.ts`、`src/stores/useMiningStore.ts`、`src/stores/useCookingStore.ts` 已补齐一组旧档兼容与状态修复：加工取消不会误清已完成槽位，温室旧档会按既有温室地块/等级自动认定解锁，周目标 `completed` 但缺失 `rewarded` 的旧档迁移更收敛，可重复捐赠会在满额领完后正确复位，矿洞旧 boss 奖励 claim array 能从老字段迁移，料理 `activeBuff` 反序列化会清洗无效脏值。
- `src/composables/useDialogs.ts`、`src/stores/useAchievementStore.ts` 已补上节日小游戏奖励 receipt 防重与成就发现时间辅助函数的损坏修复，避免节日领奖重复入账，并恢复受损编辑后导致的成就 store 语法/时间串问题。
- 本轮修复已再次通过 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run type-check` 与 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run build` 验证。

#### 0418 Docker 重启后服务端存档自恢复与待同步保底
- `src/utils/accountStorage.ts`、`src/utils/protectedApi.ts` 已补上“当前账号 / CSRF 强制刷新 + 受保护请求自动恢复”底层能力；在线写请求在遇到 `401 / 403` 时会先无刷新重拉账号上下文与 CSRF，再自动重试一次，不再默认要求玩家手动刷新页面。
- `src/utils/serverSaveApi.ts`、`src/utils/mailboxApi.ts`、`src/utils/taoyuanHallApi.ts`、`src/utils/quotaExchangeApi.ts` 已统一接入这套恢复层；服务端存档、邮箱读写、交流大厅发帖 / 回帖 / 举报 / 图片上传、额度兑换等关键在线写操作现在会共享同一套登录态 / 鉴权恢复逻辑。
- `src/stores/useSaveStore.ts` 已将服务端存档改成“先本地保底、后服务端同步”的链路：服务端模式下保存会先把当前加密快照写入按账号隔离的浏览器待同步缓存，再尝试上传；服务短暂不可用时不会直接丢档，而是保留待同步副本，待服务恢复后再自动补传。
- `src/stores/useSaveStore.ts` 同时已补齐服务端槽位读取合并逻辑：如果某个槽位存在本地待同步副本，菜单与存档管理会优先读取这份最新快照，而不是把它误显示成“空槽位”或旧档内容。
- `src/App.vue`、`src/views/MainMenu.vue`、`src/views/GameLayout.vue` 已接入自动补传触发点：应用启动、切回前台、浏览器重新联网、进入主菜单、进入游戏中都会主动尝试同步待上传存档；游戏运行期间另有轻量轮询持续补传，尽量覆盖 Docker 重启窗口。
- `src/components/game/SaveManager.vue`、`src/components/game/MainMenuContinueList.vue`、`src/composables/useEndDay.ts` 已补上“待同步”可见提示与自动存档兜底反馈：手动保存成功但尚未上传时，会明确提示“已本地保底，稍后自动同步”；结束一天触发 autosave 时若命中待同步保底，也会给出非阻塞提醒，不再静默失败。
- 本轮修复已完成 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run type-check` 与 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run build` 验证。

#### 0418 工坊免费配方、切页残留态与领奖 / 批量购买收口
- `src/stores/usePlayerStore.ts` 已修正 `spendMoney(0)` 语义：0 文消费现在视为成功 no-op，不再把工坊里的免费配方统一误判为“制作失败”。
- `src/composables/useCombinedInventory.ts`、`src/views/game/ProcessingView.vue` 已把临时背包纳入工坊材料统计与真实扣料链路；免费肥料、保湿土、采脂器等配方现在会统一从“主背包 + 临时背包 + 仓库”读取和消耗材料，不再出现弹窗显示材料足够但点击后提示“材料不足 / 制作失败”的分叉。
- `src/composables/useNavigation.ts`、`src/views/game/MiningView.vue`、`src/views/game/HanhaiView.vue` 已补上矿洞探索与瀚海牌局的切页守卫：进行中的探索 / 牌局不能直接切出页面，避免残留运行时状态继续拦截保存。
- `src/views/game/MuseumView.vue` 已为学者委托奖励与博物馆里程碑奖励补上背包容量禁用态与失败提示，不再出现按钮可点但点击后像“没反应”的情况。
- `src/views/game/ShopView.vue` 已把背包容量合入批量购买弹窗的 `canBuy / maxCount` 计算，批量购买数量不再只按金钱和库存上限推导。
- `src/stores/useSaveStore.ts`、`src/utils/taoyuanHallApi.ts` 已顺手修正本轮构建阻塞细节，恢复 `npm run type-check` 与 `npm run build` 的通过状态。
- 本轮修复已完成 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run type-check` 与 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run build` 验证。

#### 0417 仙灵显现场景弹层关闭异常修复
- `src/components/game/DiscoveryScene.vue` 已重做仙灵“传闻 / 邂逅 / 显现”剧情弹层的收尾交互：正文区域改为独立滚动，底部操作区固定保留“继续 / 结束”按钮，并在场景切换时重置 `currentIndex`、`playedScenes`、`hasChosen` 与 `choiceResponse`，避免长文本把按钮挤出可视区，或上一段剧情的本地状态串到下一段后导致弹层看起来“关不掉”。
- `src/views/GameLayout.vue`、`src/views/game/NpcView.vue` 已为 `DiscoveryScene` 挂载点补上基于 `npcId + step.id` 的 `key`，确保仙灵发现队列切到下一段剧情或在仙灵页回顾旧剧情时不会复用脏组件实例。
- 本次修复已通过 `npm run build` 构建验证；尚未补写“已完成实机复现场景回归”的结论。

#### 0414 存档权威与瀚海扑克结算收口
- `server/src/routes/api.js` 已移除 `GET /api/taoyuan/save/:slot` 的 active slot 副作用，并新增显式服务端当前槽位设置接口，避免“读取存档=偷偷改奖励落点”。
- `src/utils/serverSaveApi.ts`、`src/stores/useSaveStore.ts` 已在服务端读档成功后显式同步当前 active slot；邮箱奖励现在只会在“当前运行中的就是同一个服务端槽位”时自动热刷新，不再把本地会话误报成“已到账当前存档”。
- `src/stores/useMailboxStore.ts`、`src/views/game/MailView.vue` 已补齐邮件奖励落点提示：会区分“已同步当前服务端存档”“仅写入服务端槽位，当前未自动切换”“刷新失败需手动载入”等语义。
- `src/stores/useSettingsStore.ts` 已禁止正式环境从导入档恢复 `lateGameFeatureOverrides` / `lateGameBalanceOverrides`，避免调试覆写穿透到线上会话。
- `src/types/hanhai.ts`、`src/components/game/TexasHoldemGame.vue`、`src/views/game/HanhaiView.vue`、`src/stores/useHanhaiStore.ts` 已将瀚海扑克从“前端直传最终筹码”改为“预生成整场牌组 + 上报玩家操作轨迹 + store 复盘校验后结算”，并把场外补注改为结算时统一扣减，收回了任意伪造 `finalChips` 的入口。
- `server/src/taoyuanHall.js`、`server/src/routes/api.js`、`src/views/game/WalletView.vue` 已把额度兑换绑定到当前已载入的服务端存档：服务端会先校验 active save，再真实扣改桃源货币，前端未载入服务端存档时无法继续兑换。
- `src/composables/useGameLog.ts` 已关闭 Qmsg 的 HTML 渲染，并让 `resetLogs()` 同步清空日志历史，避免全局 HTML 注入面与新档残留旧日志。
- `src/stores/useAchievementStore.ts`、`src/stores/useCookingStore.ts` 已修复祠堂超额吞物、完美度技能归一化失真、烹饪技能门槛旁路与 `eat()` 先删物后验表的问题。
- `src/views/MainMenu.vue` 与 `/api/public-config` 返回链接已增加站内安全校验，不再直接跳转到未校验的外部地址。
- `src/data/items.ts`、`src/data/villageProjects.ts`、`src/data/sampleSaves.ts`、`scripts/qa-late-game-samples.mjs` 已补齐 `paper` 正式物品定义、修正 `standard_bait` 奖励引用、修复鱼塘样例 genetics schema，并把样例档 QA 从“字段存在”提升到“关键 schema + itemId 合法性”校验。

#### 0415 引导面板与图鉴提示交互修复
- `src/components/game/GuidanceDigestPanel.vue` 已把路线按钮补成“记下路线 + 按目标页跳转”的真实交互，不再出现面板按钮可点但没有承接动作的假入口。
- `src/stores/useTutorialStore.ts` 已补齐 guidance digest 的视图新鲜度 key，并让 summary 的 `dismissed` 状态优先于 `adopted`；“收起提示”现在会真正把当前提示收起，不再回退显示已收起内容。
- `src/components/game/TopGoalsPanel.vue`、`src/views/game/MailView.vue` 已补挂 `top_goals` / `mail` guidance surface，避免配置里已有摘要定义但页面没有统一面板入口。
- `src/components/game/ItemCollectionTab.vue` 已把图鉴阶段里程碑里带 `panel` 的效果条目改成可点击入口，和未发现条目引导保持一致，不再只是静态标签。
- `src/components/game/TopGoalsPanel.vue` 已把跨系统 weekly decision loop 收敛为玩家可见、可点击的常驻路线条，并为主题周、市场轮换和本周重点目标补上“去任务板 / 去商圈 / 去育种”等 CTA。
- `src/components/game/TopGoalsPanel.vue` 已调整超宽屏布局为“内容自适应高度 + 非等高三列”，避免“本季目标”过长时把“今日目标 / 当前里程碑”一并撑成大块留白。
- `src/views/GameLayout.vue` 已为 `game-layout-content` 增加统一滚动视口与场景内容锚点；任意场景切换成功后，内容区会平滑定位到目标规划下方的新场景开头，避免顶部大块目标规划保持不动时让玩家误以为场景没有切换。
- `src/components/game/topGoals/TopGoalsGoalCard.vue` 与 `src/components/game/topGoals/TopGoalsDetailTabs.vue` 已继续收紧目标详情区的信息层级：长期目标 / 本季全部目标从“多层嵌套卡片”压平成更轻的列表式展开结构，顶部主卡片里的高亮 `action.label ->` 也已从描述文案下方压进同一行尾部，并去掉“点击可直达”辅助提示文案，进一步降低卡片高度与视觉噪音。
- `src/views/game/MailView.vue` 已把移动端邮箱改成 master-detail 结构：手机上会先看邮件列表，进入详情后可直接“返回列表 / 上一封 / 下一封”，不再需要长距离回滚找下一封邮件。
- `server/src/index.js`、`server/src/routes/api.js` 已为首页“关于游戏”内容图片补上旧路径兼容与公开访问别名，避免历史内容中的 `/taoyuan/hall/uploads/...` 图片在首页弹窗中继续显示为破图。

### 新增功能

#### 0415 图鉴 / 百科资料架构重构
- `src/data/itemEncyclopedia.ts` 已新增图鉴 / 百科共享资料辅助层，统一收口物品来源、用途说明、分类细节、加工反查、关联词条与推荐入口，避免图鉴和百科继续维护两套口径。
- `src/data/glossary.ts` 已从纯静态折叠词条升级为“资料注册表”，为词条补齐 `intents`、`keywords`、`relatedPanels`、`relatedEntryIds`、`spoiler` 与统一 `searchText`，支持按“怎么获得 / 有什么用 / 查送礼 / 查解锁 / 看地点条件 / 看相关系统”组织资料。
- `src/components/game/GlossaryTab.vue` 已重做为问题导向百科页：新增问题型快捷筛选、分类计数、隐秘词条开关、命中高亮、左侧词条列表 + 右侧详情布局，以及相关词条 / 相关系统跳转，不再只是单列折叠清单。
- `src/components/game/ItemCollectionTab.vue`、`src/views/game/AchievementView.vue` 已补齐“按问题去百科”入口与“图鉴看收录、百科查机制”的角色提示；玩家现在可从图鉴直接带着问题切到百科，而不需要先自己判断该去哪一页查资料。
- 本轮改动已完成 `vite build` 构建验证；`vue-tsc -b` 仍受当前分支既有类型错误阻塞，但未发现本轮图鉴 / 百科改造额外引入新的打包问题。

#### 0412 主线执行面归一
- 已将 `D:/taoyuan-latest/0412plan.md` 确认为唯一执行主线。
- `TODO.md` 与 `后期经济治理实施索引-2026-04-11.md` 的“当前下一项”已统一改为按 0412 主线持续推进，不再使用“全部 120 项主线已完成”的口径。

- `0412plan.md` 顶部已补充 `0410-1plan.md` 参考文档说明，便于后续代理查阅历史审计来源。

#### 0412 周循环收口（ORDER-027 / WEEK-030 ~ WEEK-036）
- `src/views/dev/LateGameDebugView.vue` 已新增最近一次高阶订单生成 trace 区块，可直接查看最终命中原因、偏置来源、attempt 列表、候选权重与 anti-repeat 阻断原因。
- `src/types/goal.ts`、`src/data/goals.ts`、`src/stores/useGoalStore.ts`、`src/composables/useEndDay.ts` 已补齐周目标结算摘要、主题周奖励池、周 streak、失败柔性补偿与周边界结算接线，旧周目标现会先结算再刷新新周。
- 周结算邮件现复用 system campaign 通道发送单封简报；若触发柔性补偿，会在同一封邮件中附带补偿奖励。
- `src/stores/useShopStore.ts` 与 `src/views/game/ShopView.vue` 已新增“主题周承接货架”推荐；`src/components/game/TopGoalsPanel.vue` 已新增上周结算与连周进度摘要。
- 本轮改动已再次通过 `npm run type-check`，并已把 `0410-1plan.md` 的 `TYX-ORDER-025 ~ TYX-WEEK-036` 回写为已完成状态。

#### 0410 任务台账续推
- `0410-1plan.md` 已恢复为可持续回写的 1~108 任务台账。
- `037 ~ 108` 已按代码真相启动逐模块审计；当前已确认 `VILL`、`HANH`、`MUSE` 等终局经营模块存在大规模实现痕迹，后续会继续按模块补齐回写。
- 本轮已将 `HANH-046 ~ 054`、`MUSE-073 ~ 081`、`SOCIAL-082 ~ 090`、`SHOP-091 ~ 099`、`SAVE-100 ~ 108` 回写为完成状态，后续聚焦 `VILL / BREED / POND` 的剩余审计与缺口续推。

#### POND-064 / POND-065 鱼塘评级与资格快照
- `src/types/fishPond.ts` 已新增统一鱼塘评级与资格快照结构，包括 `PondRatingBreakdown`、`PondFishRatingSnapshot`、`PondEligibilitySnapshot` 等类型。
- `src/stores/useFishPondStore.ts` 已新增统一评级计算、鱼个体评分快照与按鱼种聚合的 eligibility 快照，订单筛选现在会优先返回总评分更高的可交付个体。
- `src/views/game/FishPondView.vue` 已新增“经营评级 / 资格快照”概览，并在鱼详情弹窗中展示世代、观赏、食用、健康、稳定和总评。
- 本轮改动已通过 `npm run type-check`，并已把 `0410-1plan.md` 的 `TYX-POND-064 ~ TYX-POND-065` 回写为完成状态。

#### BREED-055 / BREED-056 育种经营标签与统一评分
- `src/types/breeding.ts` 已新增 `BreedingCommercialTag`、`BreedingStabilityRank`、`BreedingScoreBreakdown` 等统一经营评分类型。
- `src/stores/useBreedingStore.ts` 已新增育种商业标签、稳定度等级与统一评分计算入口，后续订单匹配、展示标签与认证状态可直接复用。
- `src/views/game/BreedingView.vue` 已在种子详情弹窗中新增“统一评分”区块，直接展示总分、稳定度等级与经营标签。
- 本轮改动已通过 `npm run type-check`，并已把 `0410-1plan.md` 的 `TYX-BREED-055 ~ TYX-BREED-056` 回写为完成状态。

#### BREED-057 / BREED-058 育种订单匹配与展示标签
- `src/types/quest.ts`、`src/data/quests.ts` 已为高阶育种订单补齐经营标签、统一评分与稳定度档位门槛，并把这些条件接入订单生成筛选、要求摘要和评分提示文案。
- 首批茶系、宴席系与储运系育种订单现已开始消费 `requiredCommercialTags`、`requiredBreedScoreMin` 与 `requiredStabilityRank`。
- `src/types/breeding.ts`、`src/stores/useBreedingStore.ts`、`src/views/game/BreedingView.vue` 已补齐展示标签与展陈价值输出，种子详情弹窗现可直接查看 `showcaseTags` 与 `exhibitWorth`。
- 本轮改动已通过 `npm run type-check`，并已把 `0410-1plan.md` 的 `TYX-BREED-057 ~ TYX-BREED-058` 回写为完成状态。

#### BREED-059 谱系认证与稳定批次记录
- `src/types/breeding.ts` 已新增 `BreedingCertificationRecord`，用于持久记录某个杂交品系是否达到稳定供货线。
- `src/stores/useBreedingStore.ts` 已新增 `certifiedLineages`、`getCertificationRecord()` 与自动认证逻辑；当图鉴世代、种植次数和综合分达到门槛时，会自动落成认证记录并写入日志。
- `src/views/game/BreedingView.vue` 的图鉴详情弹窗已新增“谱系认证”展示，能直接看到某个杂交品系是否已经达到认证供货线。
- 本轮改动已通过 `npm run type-check`，并已把 `0410-1plan.md` 的 `TYX-BREED-059` 回写为完成状态。

#### BREED-060 育种周赛 / 品鉴会框架
- `src/types/breeding.ts`、`src/data/breedingContests.ts` 已补齐育种周赛定义、状态与结算摘要结构。
- `src/stores/useBreedingStore.ts` 已新增本周育种周赛状态、候选样本筛选、报名/取消报名、周切换刷新与结算逻辑。
- `src/composables/useEndDay.ts` 已在周边界接入育种周赛结算与新周赛事刷新。
- `src/views/game/BreedingView.vue` 已新增本周育种周赛摘要，并支持在种子详情弹窗中直接报名或取消报名。
- 本轮改动已通过 `npm run type-check`，并已把 `0410-1plan.md` 的 `TYX-BREED-060` 回写为完成状态。

#### BREED-061 / BREED-062 / BREED-063 育种保底、物流与规划器
- `src/types/economy.ts`、`src/data/balance/lateGameBalance.ts` 已新增育种失败保底与鱼塘高阶养护的统一平衡参数，后续失败回收、展示池与高阶维护均从同一配置读取。
- `src/data/items.ts`、`src/stores/useBreedingStore.ts` 已新增 `育种残留`、`谱系认证签`、`保鲜封签` 等失败回收 / 物流补材；高代失败批次现在会回收为研究、认证与储运可复用材料，不再只是单纯掉回一颗降属性种子。
- `src/data/quests.ts`、`src/views/game/QuestView.vue` 已把 `金蜜宴筹备`、`雪蒜囤储令`、`茶席陈列套组` 接到真实物流消耗，订单详情会明确展示封签、认证补材和储运材料要求。
- `src/stores/useGoalStore.ts`、`src/views/game/BreedingView.vue` 已新增“育种规划器 2.0”，会同时汇总本周订单、下周主题周、图鉴缺口、推荐亲本与物流补材缺口，并在育种页展示最近一次失败回收摘要。
- 本轮改动已通过 `npm run type-check`，并已把 `0410-1plan.md` 的 `TYX-BREED-061 ~ TYX-BREED-063` 回写为完成状态。

#### POND-066 / POND-067 鱼塘周赛数据结构与报名结算
- `src/types/fishPond.ts`、`src/data/fishPondContests.ts` 已补齐鱼塘周赛定义、状态与结算摘要结构。
- `src/stores/useFishPondStore.ts` 已新增本周鱼塘周赛状态、候选样本筛选、报名/取消报名、周切换刷新与结算逻辑。
- `src/composables/useEndDay.ts` 已在周边界接入鱼塘周赛结算与新周赛事刷新。
- `src/views/game/FishPondView.vue` 已新增本周周赛摘要，并支持在鱼详情弹窗中直接报名或取消报名。
- 本轮改动已通过 `npm run type-check`，并已把 `0410-1plan.md` 的 `TYX-POND-066 ~ TYX-POND-067` 回写为完成状态。

#### POND-071 鱼塘主题周钩子
- `src/stores/useFishPondStore.ts` 已新增 `currentThemeWeekPondFocus`，把主题周对鱼塘的承接焦点收口到鱼塘 store。
- `src/views/game/FishPondView.vue` 已新增“主题周承接”摘要卡，直接展示当前主题周对鱼塘周赛与样本培养的建议。
- 本轮改动已通过 `npm run type-check`，并已把 `0410-1plan.md` 的 `TYX-POND-071` 回写为完成状态。

#### POND-072 鱼塘总览与评分 UI
- `src/views/game/FishPondView.vue` 现已把本周周赛、主题周承接、经营评级 / 资格快照、鱼个体总评一并收口到主页面与详情弹窗。
- 玩家现在无需逐条点开全部样本，也能直接判断高价值个体、周赛候选与当前鱼塘承接方向。
- 本轮改动已通过 `npm run type-check`，并已把 `0410-1plan.md` 的 `TYX-POND-072` 回写为完成状态。

#### POND-068 / POND-069 / POND-070 鱼塘高阶养护、展示池与合同承接
- `src/types/fishPond.ts`、`src/stores/useFishPondStore.ts` 已新增高阶养护状态、展示池镜像快照、展示总览与高评分样鱼识别；高评分样鱼现在会带来额外水质压力，并可通过 `观赏饲料`、`高级净水剂` 获取周赛与展示加成。
- `src/data/items.ts`、`src/stores/useShopStore.ts` 已新增 `观赏饲料`、`高级净水剂`、`保鲜封签`，形成鱼塘高阶维护与育种物流共用的真实消耗层。
- `src/views/game/FishPondView.vue` 已新增“高阶养护”与“展示池 / 观赏缸”面板，并支持在鱼详情弹窗中直接把高评分成熟样鱼加入或移出展示池。
- `src/stores/useMuseumStore.ts` 已把鱼塘展示池接入博物馆陈列评分；`src/data/hanhai.ts`、`src/stores/useHanhaiStore.ts` 已新增鱼塘活体押运合同与告示板偏置，鱼塘不再只通过订单承接。
- 本轮改动已通过 `npm run type-check`，并已把 `0410-1plan.md` 的 `TYX-POND-068 ~ TYX-POND-070` 回写为完成状态。

#### 0412 / 0410 总验证与文档收口
- 已完成 `npm run type-check`、`npm run qa:late-game-samples`、`npm run lint` 三项自动验证。
- `qa:late-game-samples` 样例档自动验证已覆盖 `late_economy_foundation`、`breeding_specialist`、`fishpond_operator`、`endgame_showcase` 四组后期样例。
- `0412plan.md`、`0410-1plan.md`、`TODO.md`、`后期经济治理实施索引-2026-04-11.md` 已统一回写为“0412 主线 + 0410(1~108) 已完成收口”。

#### WS09 家庭 / 配偶 / 仙灵陪伴循环（T081）
- 完成基线审计与 KPI 定义：
  - `src/data/goals.ts` 已新增 `WS09_FAMILY_COMPANIONSHIP_BASELINE_AUDIT`，统一收口婚后家庭周活率、家庭心愿完成率、非战斗后期目标覆盖度、关系系统回访率 4 个核心指标。
  - 已补齐 2 个护栏指标：伴侣自动化占比、情感反馈可见度，并新增 3 档样本玩家分层、1 条“关系线工具人化”软回滚条件与跨 `useNpcStore` / `useHiddenNpcStore` / `useHomeStore` / `useGoalStore` / `useQuestStore` / `useBreedingStore` / `useFishingStore` 的联动口径。
  - `src/data/npcs.ts`、`src/data/hiddenNpcHeartEvents.ts` 已补出 WS09 审计对象池，明确可婚 / 可知己 NPC 与可结缘仙灵的基线样本范围。
  - `src/stores/useNpcStore.ts`、`src/stores/useHiddenNpcStore.ts` 已新增统一 audit overview / snapshot 读取入口，便于后续 T082+ 沿用同一口径继续扩容。
  - 为恢复当前分支自检，顺手修复了 `src/stores/useGoalStore.ts` 的污染定义与 `src/types/log.ts` 的日志 tag 缺口，当前已再次通过 `npm run type-check`。

#### WS09 家庭 / 配偶 / 仙灵陪伴循环（T082）
- 完成数据结构与类型定义：
  - `src/types/npc.ts` 已补齐 `RelationshipContentTier`、婚后分工、家庭心愿板、挚友协作项目与子女训练状态等类型骨架，并为 `NpcDef` / `NpcState` / `ChildState` / `PregnancyState` 预留后续字段。
  - `src/types/hiddenNpc.ts` 已补齐 `SpiritBondTier`、`SpiritBlessingDef`，并为 `HiddenNpcState` 预留 `bondTier`、`resonancePoints`、`activeBlessingId`、`unlockedBlessingIds`、`claimedBondMemoryIds` 等扩展字段。
  - `src/data/npcs.ts`、`src/data/hiddenNpcHeartEvents.ts` 已新增婚后分工、家庭心愿板、挚友项目、仙灵祝福与共鸣配置的默认结构与创建函数，配置结构已覆盖 P0 / P1 / P2 三档。
  - `src/data/goals.ts` 已补出 `WS09_FAMILY_WISH_GOAL_CONFIG`，`src/types/goal.ts` 也已为主题周预留关系线焦点字段，便于后续主题周 / 家庭心愿挂接。
  - `src/stores/useNpcStore.ts`、`src/stores/useHiddenNpcStore.ts` 已同步接入新字段、版本号与旧档回填，当前旧档缺少这些字段时会自动安全补齐，并通过 `npm run type-check`。

#### WS09 家庭 / 配偶 / 仙灵陪伴循环（T083）
- 完成 Store 状态与 API 扩展：
  - `src/stores/useNpcStore.ts` 已新增婚后分工、家庭心愿、挚友协作项目的统一读写入口，包括 `assignHouseholdRole()`、`activateFamilyWish()`、`registerZhijiProject()` 等 action 与对应 overview / debug snapshot。
  - `src/stores/useNpcStore.ts` 现已暴露 `relationshipContentTier`、`getAvailableHouseholdRoles()`、`getFamilyWishOverview()`、`getRelationshipDebugSnapshot()` 等统一 getter，后续页面无需自行拼装关系线状态。
  - `src/stores/useHiddenNpcStore.ts` 已新增仙灵共鸣、祝福切换与记忆领取入口，包括 `addSpiritResonance()`、`activateSpiritBlessing()`、`clearSpiritBlessing()`、`claimBondMemory()` 与 `getHiddenNpcDebugSnapshot()`。
  - 供奉流程现会在 store 内部累计 `resonancePoints` 并同步 `bondTier`，后续日结 / 周结与页面展示可以直接复用 store 暴露结果。
  - 当前已满足“页面只消费 store 暴露结果、关键逻辑可单独调用、存档序列化完整”的验收目标，并通过 `npm run type-check`。

#### WS09 家庭 / 配偶 / 仙灵陪伴循环（T084）
- 完成日结 / 周结调度接入：
  - `src/stores/useNpcStore.ts` 已新增 `processRelationshipCycleTick()`，统一处理婚后分工周期推进、家庭心愿周结、子女训练周重置与挚友协作项目的周切换状态。
  - `src/stores/useHiddenNpcStore.ts` 已新增 `processSpiritBondTick()`，统一处理仙灵祝福在周切换时的收束、共鸣档位同步与关系线衍生状态刷新。
  - `src/composables/useEndDay.ts` 现已把家庭 / 配偶 / 仙灵陪伴线正式接入与村庄建设、博物馆、公会、瀚海、商店同层的周切换 tick 编排。
  - 关系线 tick 产生的周结信息现会写入结构化日志，方便后续 UI、调试面板与 QA 验证直接复用同一口径。
  - 当前已满足“跨天、跨周切换状态一致、日志可见且不散落在页面”的验收目标，并通过 `npm run type-check`。

#### WS09 家庭 / 配偶 / 仙灵陪伴循环（T085）
- 完成内容配置首批落地：
  - `src/data/npcs.ts` 已新增 `WS09_FAMILY_WISH_DEFS`，并为柳娘、阿石、秋月、春兰、大牛、墨白等首批关系线角色补入 `householdRoleIds`、`familyWishIds`、`zhijiProjectIds` 挂点。
  - 现有婚后分工、家庭心愿与挚友协作内容已覆盖 P0 / P1 / P2 三档，可支撑后续页面、调度与跨系统联动继续扩容。
  - `src/data/hiddenNpcHeartEvents.ts` 已新增 `WS09_HIDDEN_NPC_BLESSING_ASSIGNMENTS` 与首批结缘记忆奖励池，明确龙灵、桃夭、月兔、山翁、归女的祝福承接范围。
  - `src/data/goals.ts` 已为春种、夏渔、秋收加工、豪华经营等主题周补入家庭 / 仙灵 / 挚友焦点字段，后续主题周面板与推荐系统可以直接复用。
  - 当前已满足“首批内容覆盖 2~3 个版本迭代且可读、可扩展、可筛选”的验收目标，并通过 `npm run type-check`。

#### WS09 家庭 / 配偶 / 仙灵陪伴循环（T086）
- 完成页面入口与信息展示：
  - `src/views/game/NpcView.vue` 已新增“陪伴总览”摘要卡，直接展示关系线内容阶段、当前家庭心愿、婚后分工数、挚友项目数与孩子数量。
  - `src/views/game/NpcView.vue` 的仙灵页已新增“仙缘运营”卡片，可直接查看已显现仙灵数、已结缘数、总共鸣点、已解锁能力，以及选中仙灵的当前祝福与可用祝福列表。
  - `src/views/game/HomeView.vue` 已新增“家庭 / 陪伴”区块，让宅院页也能看到婚后分工、家庭心愿与孩子成长的当前状态。
  - 关系线入口现已从“只有弹窗内零散操作”升级为“页内就能感知进度、目标与下一步”的展示状态。
  - 当前已满足“玩家能在 10 秒内知道这条关系线现在做到哪、下一步关注什么”的验收目标，并通过 `npm run type-check`。

#### WS09 家庭 / 配偶 / 仙灵陪伴循环（T087）
- 完成跨系统联动闭环：
  - `src/stores/useQuestStore.ts` 已把家庭心愿、婚后分工与仙灵祝福接入任务板 / 高阶订单偏置链路，QuestView 现可直接看到“家庭 / 仙缘风向”。
  - `src/stores/useBreedingStore.ts`、`src/stores/useFishingStore.ts`、`src/stores/useHomeStore.ts` 已分别新增 `companionshipBreedingFocus`、`companionshipFishingFocus`、`companionHomeOverview`，用于承接关系线对育种、钓鱼与宅院经营的本周建议。
  - `src/views/game/BreedingView.vue`、`src/views/game/FishingView.vue`、`src/views/game/QuestView.vue` 已新增相应联动提示区块，玩家可从旧系统页面直接看到陪伴线带来的决策变化。
  - 当前已满足“关系线反向影响至少 2 条以上既有系统活跃度，并可在页面与日志看到联动证据”的验收目标，并通过 `npm run type-check`。

#### WS09 家庭 / 配偶 / 仙灵陪伴循环（T088）
- 完成事务安全与防刷处理：
  - `src/stores/useNpcStore.ts` 已新增 `relationshipActionLocks`、`beginRelationshipAction()`、`finishRelationshipAction()`、`createRelationshipActionSnapshots()` 与 `rollbackRelationshipAction()`。
  - 约会、求婚、知己结缘 / 断缘、和离、婚后分工、家庭心愿与挚友项目等关键动作现已接入运行时锁与异常回滚。
  - `src/stores/useHiddenNpcStore.ts` 已新增 `spiritActionLocks`、`beginSpiritAction()`、`finishSpiritAction()`、`createSpiritActionSnapshots()` 与 `rollbackSpiritAction()`。
  - 供奉、求缘、结缘、解缘、仙灵祝福启用与记忆领取现已具备重复点击防护与异常回滚护栏。
  - 当前已满足“重复点击不重入、异常结算可回滚、读档后无残留锁”的验收目标，并通过 `npm run type-check`。

#### WS09 家庭 / 配偶 / 仙灵陪伴循环（T089）
- 完成调参与运营开关接线：
  - `src/data/npcs.ts` 已新增 `WS09_RELATIONSHIP_TUNING_CONFIG`，统一收口 companion quest bias、婚后分工、家庭心愿、挚友协作、展示数量、阶段阈值与周推进上限等参数。
  - `src/data/hiddenNpcHeartEvents.ts` 已新增 `WS09_SPIRIT_TUNING_CONFIG`，统一收口仙灵祝福、结缘记忆、共鸣增益与周切换重置开关。
  - `src/stores/useNpcStore.ts`、`src/stores/useHiddenNpcStore.ts` 与 `src/stores/useQuestStore.ts` 已正式消费这些配置，使关系线偏置、tier 解锁、祝福启用与共鸣成长支持快速热调或降级。
  - 当前已满足“不改业务逻辑即可调整至少 8 个核心参数并支持快速关闭异常活动”的验收目标，并通过 `npm run type-check`。

#### WS09 家庭 / 配偶 / 仙灵陪伴循环（T090）
- 完成 QA、数值验收与上线文档收口：
  - `src/data/npcs.ts` 已内置 `WS09_ACCEPTANCE_SUMMARY`、`WS09_QA_CASES`、`WS09_RELEASE_CHECKLIST`、`WS09_COMPENSATION_PLANS`、`WS09_RELEASE_ANNOUNCEMENT`。
  - QA / 验收范围已覆盖家庭心愿、婚后分工、挚友协作、仙灵供奉与祝福、跨系统联动、开关降级、旧档兼容与异常回滚等发布场景。
  - `后期经济治理与中后期循环扩展AI实施方案-2026-04-10.md`、`TODO.md`、`后期经济治理实施索引-2026-04-11.md` 已同步回写 WS09 收口状态与下一项主线。
  - 当前 WS09 已具备可直接供 QA / 运营复用的验收摘要、上线检查项、补偿预案与公告文案，并再次通过 `npm run type-check`。

#### WS10 主题周 + 活动编排 + 邮箱运营层（T091）
- 完成基线审计与 KPI 定义：
  - `src/data/goals.ts` 已新增 `WS10_EVENT_OPERATIONS_BASELINE_AUDIT`，统一收口活动参与率、邮件打开率、活动带回流量、主题周完成率 4 个核心指标。
  - 已补齐 2 个护栏指标：强制打卡压力比、重复奖励邮件占比，并新增 3 档样本玩家分层、1 条活动层软回滚条件与跨 `useGoalStore` / `useQuestStore` / `useShopStore` / `useMailboxStore` 的联动口径。
  - `src/stores/useGoalStore.ts` 已新增 `eventOperationsBaselineAudit` 统一入口，便于后续活动编排、邮件结算与主题周扩容直接复用同一基线。
  - 当前已满足“形成可执行指标清单；至少定义 4 个核心指标、2 个护栏指标、1 个失败回滚条件”的验收目标，并通过 `npm run type-check`。

#### WS10 主题周 + 活动编排 + 邮箱运营层（T092）
- 完成数据结构与类型定义：
  - `src/types/goal.ts` 已补齐 `EventCampaignDef`、`EventOperationsState`、`ThemeWeekCampaignState`、`EventMailTemplateRef` 等活动编排与邮件运营骨架。
  - `src/types/quest.ts` 已补齐 `LimitedTimeQuestCampaignDef`、`ActivityQuestWindowState`，`src/types/shopCatalog.ts` 已补齐 `ShopCatalogActivityOfferBundleDef`。
  - `src/data/goals.ts`、`src/data/quests.ts`、`src/data/shopCatalog.ts` 已分别新增活动编排定义、限时任务窗口定义、目录承接包与默认状态创建函数。
  - `src/stores/useGoalStore.ts`、`src/stores/useQuestStore.ts`、`src/stores/useSaveStore.ts` 已同步接入这些新字段、默认值与旧档回填。
  - 当前已满足“旧档读入不报错，新字段都有默认值，结构覆盖 P0 / P1 / P2 三阶段”的验收目标，并通过 `npm run type-check`。

#### WS10 主题周 + 活动编排 + 邮箱运营层（T093）
- 完成 Store 状态与 API 扩展：
  - `src/stores/useGoalStore.ts` 已新增活动编排状态、活动总览、模板查询、激活 / 完成 / 邮件认领记录与 debug snapshot。
  - `src/stores/useQuestStore.ts` 已新增限时任务窗口状态、窗口总览、活动任务窗口激活 / 完成 / 邮件认领记录与 debug snapshot。
  - 主题周活动、活动邮件和限时任务窗口现已具备统一的 store API，后续页面和调度层无需自行拼装状态。
  - 当前已满足“页面只消费 store 暴露结果；关键逻辑可单独调用；存档序列化完整”的验收目标，并通过 `npm run type-check`。

#### WS10 主题周 + 活动编排 + 邮箱运营层（T094）
- 完成日结 / 周结调度接入：
  - `src/stores/useGoalStore.ts` 已新增 `processEventOperationsTick()`，统一处理主题周活动编排的周切换激活、收束与待发送邮件模板引用。
  - `src/stores/useQuestStore.ts` 已新增 `processActivityQuestWindowTick()`，统一处理限时任务窗口的周切换激活与收束。
  - `src/composables/useEndDay.ts` 现已把这两条活动层 tick 正式接入周切换节点，并把活动编排 / 活动任务日志写入结构化日志。
  - 当前已满足“跨天、跨周、跨季切换状态一致且日志可见”的验收目标，并通过 `npm run type-check`。

#### WS10 主题周 + 活动编排 + 邮箱运营层（T095）
- 完成内容配置首批落地：
  - `src/data/goals.ts` 已补齐 `WS10_EVENT_MAIL_TEMPLATE_REFS`、`WS10_EVENT_CAMPAIGN_DEFS` 与首批主题周活动编排样例。
  - `src/data/quests.ts` 已补齐 `WS10_LIMITED_TIME_QUEST_CAMPAIGN_DEFS`，形成主题周轮转、限时供货、全服共建三档活动任务内容。
  - `src/data/shopCatalog.ts` 已补齐 `WS10_ACTIVITY_OFFER_BUNDLES`，形成活动目录承接包。
  - 当前首批活动内容已覆盖 P0 / P1 / P2 三档，可支撑后续页面展示、调度与联动扩容，并通过 `npm run type-check`。

#### WS10 主题周 + 活动编排 + 邮箱运营层（T096）
- 完成页面入口与信息展示：
  - `src/views/game/QuestView.vue` 已新增“活动编排”与“限时任务窗口”提示区块，可直接展示当前活动编排、限时任务窗口与对应邮件模板。
  - `src/views/game/MailView.vue` 已新增“活动邮件摘要”，直接展示当前活动、可领邮件数与活动邮件数量。
  - `src/components/game/TopGoalsPanel.vue` 已新增“本周活动”摘要卡，玩家无需打开深层弹窗即可读懂当前活动层节奏。
  - 当前已满足“玩家能在 10 秒内知道当前活动编排、邮件结算重点与限时任务窗口”的验收目标，并通过 `npm run type-check`。

#### WS10 主题周 + 活动编排 + 邮箱运营层（T097）
- 完成跨系统联动闭环：
  - `src/stores/useShopStore.ts` 已新增 `activityCampaignOfferBundle` / `activityCampaignOfferRecommendations`，活动编排可直接放大目录承接。
  - `src/stores/useGuildStore.ts`、`src/stores/useMuseumStore.ts`、`src/stores/useHanhaiStore.ts` 的 `crossSystemOverview.recommendedActions` 已追加活动承接提示。
  - `src/composables/useEndDay.ts` 周切换时会写入“活动联动”结构化日志，明确记录活动层已联动的目录、公会、博物馆与瀚海承接。
  - 当前已满足“活动层反向影响多条既有系统路线，并可从日志与页面看到联动证据”的验收目标，并通过 `npm run type-check`。

#### WS10 主题周 + 活动编排 + 邮箱运营层（T098）
- 完成事务安全与防刷处理：
  - `src/stores/useGoalStore.ts` 已新增 `eventOperationLocks`、活动编排快照与回滚逻辑，并把活动激活、收尾、邮件认领与周切换 tick 接入幂等锁。
  - `src/stores/useQuestStore.ts` 已新增 `activityQuestWindowLocks`、限时任务窗口快照与回滚逻辑，并把窗口激活、收尾、邮件认领与周切换 tick 接入幂等锁。
  - 当前已满足“同一周 / 同一天重复触发活动 tick 不重入、异常状态写入可回滚”的验收目标，并通过 `npm run type-check`。

#### WS10 主题周 + 活动编排 + 邮箱运营层（T099）
- 完成调参与运营开关接线：
  - `src/data/goals.ts` 已新增 `WS10_EVENT_OPERATION_TUNING_CONFIG`，统一收口 event campaign、activity quest window、mailbox digest、预览数量、活动节奏与待发送模板上限等参数。
  - `src/stores/useGoalStore.ts`、`src/stores/useQuestStore.ts` 已正式消费这些开关和展示配置，使活动编排、限时任务窗口与邮件摘要支持快速热调或降级。
  - 当前已满足“不改业务逻辑即可调整至少 8 个核心参数并支持快速关闭异常活动”的验收目标，并通过 `npm run type-check`。

#### WS10 主题周 + 活动编排 + 邮箱运营层（T100）
- 完成 QA、数值验收与上线文档收口：
  - `src/data/goals.ts` 已内置 `WS10_ACCEPTANCE_SUMMARY`、`WS10_QA_CASES`、`WS10_RELEASE_CHECKLIST`、`WS10_COMPENSATION_PLANS`、`WS10_RELEASE_ANNOUNCEMENT`。
  - QA / 验收范围已覆盖活动编排切换、限时任务窗口、活动邮件摘要、开关降级、旧档兼容与异常回滚等发布场景。
  - `后期经济治理与中后期循环扩展AI实施方案-2026-04-10.md`、`TODO.md`、`后期经济治理实施索引-2026-04-11.md` 已同步回写 WS10 收口状态与下一项主线。
  - 当前 WS10 已具备可直接供 QA / 运营复用的验收摘要、上线检查项、补偿预案与公告文案，并再次通过 `npm run type-check`。

#### WS11 UI 引导、推荐系统与信息层级补强（T101）
- 完成基线审计与 KPI 定义：
  - `src/data/tutorials.ts` 已新增 `WS11_UI_GUIDANCE_BASELINE_AUDIT`，统一收口高阶页面停留时间占比、目标点击率、推荐路线采纳率、迷失反馈下降率 4 个核心指标。
  - 已补齐 2 个护栏指标：公告墙密度、推荐冲突率，并新增 3 档样本玩家分层、1 条信息层级软回滚条件与跨 `useGoalStore` / `useQuestStore` / `useShopStore` / `useBreedingStore` / `useTutorialStore` 的联动口径。
  - `src/stores/useTutorialStore.ts` 已新增 `uiGuidanceBaselineAudit` 与 `uiGuidanceOverview` 统一入口，便于后续页面、调试与 QA 复用同一份基线。
  - 当前已满足“形成可执行指标清单；至少定义 4 个核心指标、2 个护栏指标、1 个失败回滚条件”的验收目标，并通过 `npm run type-check`。

#### WS11 UI 引导、推荐系统与信息层级补强（T102）
- 完成数据结构与类型定义：
  - 新增 `src/types/tutorial.ts`，补齐 `GuidancePanelSummaryDef`、`GuidanceRecommendationRouteDef`、`GuidanceDigestState` 等推荐层类型骨架。
  - `src/data/tutorials.ts` 已新增 `WS11_GUIDANCE_PANEL_SUMMARY_DEFS`、`WS11_GUIDANCE_RECOMMENDATION_ROUTE_DEFS` 与 `createDefaultGuidanceDigestState()`。
  - `src/stores/useTutorialStore.ts` 已同步接入 `guidanceDigestState`、摘要分组、采纳 / 关闭记录与刷新入口。
  - `src/stores/useSaveStore.ts` 已补齐教程层新字段的默认值与旧档回填。
  - 当前已满足“旧档读入不报错；新字段都有默认值；配置结构覆盖 P0 / P1 / P2 三阶段”的验收目标，并通过 `npm run type-check`。

#### WS08 瀚海终局循环深化（T077）
- 完成跨系统联动闭环：
  - `src/types/goal.ts`、`src/data/goals.ts` 已为主题周补齐 `hanhaiFocusRouteIds`、`hanhaiFocusRelicSiteIds`、`hanhaiFocusBossCycleIds`、`hanhaiFocusContractIds`、`hanhaiFocusRelicSetIds`、`hanhaiFocusShopRotationIds`，让瀚海商路、遗迹、Boss、合同、套组与货架可直接进入周编排。
  - `src/stores/useHanhaiStore.ts` 已新增 `currentThemeWeekHanhaiFocus`、`questBoardBiasProfile`、`crossSystemOverview`、联动建设摘要与目录承接推荐，把主题周、村庄建设、目录消费、Boss 周期与遗迹套组统一收口到瀚海 store。
  - `src/stores/useQuestStore.ts` 现会把瀚海联动偏置并入告示板市场偏置链路，使瀚海循环会反向影响任务筹备方向。
  - `src/views/game/HanhaiView.vue` 已新增经营联动摘要、目录承接与推荐动作卡片，形成“瀚海收益 -> 目录/建设 sink -> 告示板筹备 -> 主题周/Boss/展示目标”的可视化闭环。
  - 当前已满足“至少影响 2 条现有系统活跃度，并可从日志与页面看到联动证据”的验收目标。

#### WS08 瀚海终局循环深化（T078）
- 完成事务安全与防刷处理：
  - `src/stores/useHanhaiStore.ts` 已新增 `hanhaiActionLocks`、`beginHanhaiAction()`、`finishHanhaiAction()`、`createHanhaiActionSnapshots()` 与 `rollbackHanhaiAction()`，统一收口瀚海高频操作的事务护栏。
  - `unlockHanhai()`、`buyShopItem()`、`exploreRelicSite()`、`claimRelicMilestone()`、`useTreasureMap()` 现已具备 `player / inventory / wallet / hanhai` 全链路快照与异常回滚，重复点击也会被运行时锁拦截。
  - 轮盘、骰子、猜杯、斗蛐蛐、翻牌、瀚海扑克、恶魔轮盘的入场 / 结算路径已统一接入防重与回滚保护，避免高频点击导致重复结算或半成功状态。
  - `deserialize()` 与 `reset()` 会主动清理运行时锁，确保旧档读取与新会话不会被残留锁污染。
  - 当前已满足“重复点击不重奖、异常结算可回滚、旧档读取不坏档”的验收目标，并通过 `npm run type-check`。

#### WS08 瀚海终局循环深化（T079）
- 完成调参与运营开关接线：
  - `src/data/hanhai.ts` 已新增 `HANHAI_OPERATION_TUNING_CONFIG`，按 `featureFlags / display / progression / rewards / operations / casino` 六个区块统一收口瀚海热调参数与运营开关。
  - `src/stores/useHanhaiStore.ts` 已正式消费 `hanhaiTuning`、`hanhaiFeatureFlags`、`hanhaiDisplayConfig`、`hanhaiProgressionConfig`、`hanhaiRewardConfig`、`hanhaiOperationsConfig`，并将主题周焦点、跨系统总览、目录承接推荐、告示板偏置强度、阶段阈值、Boss 顺序、商店周限购倍率、遗迹 / 藏宝图奖励倍率与赌坊参数改为配置驱动。
  - `currentThemeWeekHanhaiFocus`、`questBoardBiasProfile`、`crossSystemOverview`、`linkedVillageProjects`、`recommendedCatalogOffers` 与 `beginHanhaiAction()` / `finishHanhaiAction()` 已接入 feature flag，可按需热调或快速降级。
  - 为恢复当前分支类型自检，`src/data/goals.ts` 已补齐 `GOAL_SOURCE_LABELS.weekly` 与 5 个主题周的 `weekOfSeason`，`src/stores/useQuestStore.ts` / `src/views/dev/LateGameDebugView.vue` 也已清理未使用符号。
  - 当前已满足“不改业务逻辑即可调整至少 8 个核心参数，并支持快速关闭异常活动或降低奖励”的验收目标，并通过 `npm run type-check`。

#### WS08 瀚海终局循环深化（T080）
- 完成 QA、数值验收与上线文档收口：
  - `src/data/hanhai.ts` 已内置 `WS08_ACCEPTANCE_SUMMARY`、`WS08_QA_CASES`、`WS08_RELEASE_CHECKLIST`、`WS08_COMPENSATION_PLANS`、`WS08_RELEASE_ANNOUNCEMENT`。
  - QA / 验收范围已覆盖主题周焦点、跨系统总览、展示数量热调、阶段阈值与 Boss 顺序、奖励倍率 / 周限购 / 赌坊参数、偏置上限、feature flag 降级、旧档兼容、异常回滚与运行时锁释放等发布场景。
  - `后期经济治理与中后期循环扩展AI实施方案-2026-04-10.md`、`TODO.md`、`后期经济治理实施索引-2026-04-11.md` 已同步回写 T079 / T080 完成状态与下一项主线。
  - 当前 WS08 已具备可直接供 QA / 运营复用的验收摘要、上线检查项、补偿预案与公告文案，并再次通过 `npm run type-check`。

#### CORE 底座（TYX-CORE-001）
- 新增统一后期特性开关底座：
  - 新建 `src/data/systemFlags.ts`，集中声明后期预算、维护费、周目标、瀚海合同、鱼塘周赛、博物馆专题展、村庄繁荣度、社交长期线、高价服务合同等开关配置
  - `src/types/game.ts` 新增 `LateGameFeatureFlag`、`SystemFlagConfig`、`LateGameFeatureOverrideMap` 类型
  - `useSettingsStore` 新增统一 `isFeatureEnabled(flagId)` 查询入口，以及开发态本地覆盖、清除覆盖、读取配置等方法
  - `useSaveStore` 现会在旧档缺少 `settings` 块时补安全默认值，并在读取设置时把存档版本传给设置反序列化，用于后期特性开关默认态映射

#### CORE 底座（TYX-CORE-002）
- 新增后期经济共享类型层：
  - 新建 `src/types/economy.ts`
  - 补齐 `BudgetChannelId`、`MaintenancePlan`、`RewardTicketType`、`WeeklySettlementSummary`、`ProsperityScoreBreakdown` 等共享类型
  - `src/types/index.ts` 已导出 `economy`，便于后续预算、维护、票券、周结算、繁荣度相关模块统一引用

#### CORE 底座（TYX-CORE-003）
- 新增周循环共享时间结构：
  - 新建 `src/utils/weekCycle.ts`，统一提供 `WeekCycleInfo`、`WeekBoundaryEvent`、绝对日期与周边界计算能力
  - `useGoalStore` 的主题周 tag、周起止日计算已改为复用共享周工具，避免各处手写 `Math.floor((day - 1) / 7)`
  - `useEndDay` 的每周风险报告触发与特殊订单周末释放已改为走统一周边界信息，减少跨周逻辑分散判断
  - 自检收口补充了 QA / 发布 / 补偿类型兼容字段，并修正 `useMuseumStore` 里程碑奖励领取中的 `playerStore` 引用，确保当前批次可通过类型检查

#### CORE 底座（TYX-CORE-004）
- 新增后期平衡参数配置入口：
  - 新建 `src/data/balance/lateGameBalance.ts`，集中维护维护费倍率、票券倍率、预算收益曲线、服务合同续费倍率、高价值订单现金占比、赌坊现金期望倍率等关键参数
  - `src/types/economy.ts` 新增 `LateGameBalanceConfig`、`LateGameBalanceOverride` 与预算收益曲线类型
  - `useSettingsStore` 现支持读取合并后的后期平衡配置，并在开发态下设置 / 清空参数覆盖，便于后续快速调参而不改业务主逻辑
  - `src/data/index.ts` 已导出该配置入口，便于后续模块统一引用

#### CORE 底座（TYX-CORE-005）
- 新增后期玩法指标快照结构：
  - 新建 `src/types/analytics.ts`，统一声明 `LateGameMetricSnapshot` 与 `WeeklyMetricArchive`
  - `useGoalStore` 现持久化最近 4 周的后期玩法指标快照，并提供周度归档与最新快照读取入口
  - 周快照已覆盖净收入、周收入/支出、sink 消耗、瀚海完成度、鱼塘周赛代理值、博物馆展陈等级、社交参与度与村庄繁荣代理分等核心字段
  - `useEndDay` 在周切换时会自动归档上一周快照，供后续周报、繁荣度与调试面板复用同一底层数据
  - `useSaveStore` 已为旧档补齐 `weeklyMetricArchive` 默认结构，避免读档时缺块报错

#### CORE 底座（TYX-CORE-006）
- 新增结构化日志标签底座：
  - 新建 `src/types/log.ts`，统一声明 `GameLogCategory`、`GameLogTag` 与日志元数据结构
  - `useGameLog.addLog()` 现支持附带分类、标签与元数据写入，原日志 UI 继续兼容纯文本展示
  - 首批已接入主题周开始、周快照归档、周风险报告、目标达成、经营引导、育种完成/发现/变异、瀚海遗迹/藏宝图、村庄建设完工、种子制造机额外产出等事件
  - 为后续预算投资、维护续费、周结算、合同完成、周赛结算与调试面板聚合提供统一日志口径

#### CORE 底座（TYX-CORE-007）
- 新增中后期测试样例存档：
  - 新增 `src/data/sampleSaves.ts`，内置 4 套后期样例存档定义与元信息
  - `useSaveStore` 新增 `getBuiltInSampleSaves()` / `loadBuiltInSampleSave()`，开发态下并挂载 `__TAOYUAN_SAMPLE_SAVES__` 全局入口，方便 1 分钟内直接载入后期场景
  - 新增 `data-defaults/taoyuan_saves/` 样例元信息目录与 manifest，便于 QA / AI / 策划查看样例标签与用途
  - `README.md` 新增开发态样例存档使用说明，收口样例加载命令与清单入口

#### CORE 底座（TYX-CORE-008）
- 新增开发态后期调试面板：
  - 新增 `src/views/dev/LateGameDebugView.vue`，集中提供样例档载入、加钱、强制日结、推进到下周、调试日期切换、主题周刷新、测试特殊订单注入与票券快照注入
  - `src/router/index.ts` 新增仅开发环境可用的 `#/dev/late-game` 路由，生产构建中不会暴露该入口
  - `MainMenu.vue` 在开发环境下新增“后期调试”入口，避免继续依赖手改存档或手打控制台命令才能进入后期状态
  - 调试面板同时复用 CORE-001 / 004 / 005 / 006 / 007 底座，支持 feature flag 覆盖、平衡参数快捷预设、周快照查看与结构化日志检查
  - 新增开发态控制台对象 `__TAOYUAN_LATE_GAME_DEBUG__`，便于 QA / AI 直接以命令方式执行样例载入、周推进与状态摘要读取
  - 为本批自检收口同步修复 `useMuseumStore`、`useSaveStore`、`useGuildStore` 的类型阻塞，当前分支已重新通过 `npm run type-check`

#### CORE 底座（TYX-CORE-009）
- 新增后期经济治理实施索引：
  - 新建 `后期经济治理实施索引-2026-04-11.md`，把 `0410-1plan.md` 拆成可执行的状态索引、近期待办队列与完整任务编号清单
  - `TODO.md` 已切换为当前执行面，明确 CORE-001 ~ CORE-009 完成状态、同步规则与当前下一项 `TYX-ECON-010`
  - 为后续代理补齐“完成任务 → 更新 changelog / 索引 / TODO → 运行 type-check”的统一工作流约束

#### ECON 经济止血（TYX-ECON-010）
- 修复直接卖店未写入市场记录的问题：
  - `src/stores/useShopStore.ts` 抽出统一 `recordCompletedSale()`，收口“完成一次出售后写入市场历史”的逻辑
  - 直接卖店 `sellItem()` 与出货箱结算 `processShippingBox()` 现统一复用同一记录链路，避免后续市场热度与供需系数只统计出货箱、不统计卖店
  - `src/data/market.ts` 新增 `SellRecordSource` 类型，用于明确出售来源并为后续价格管线/调试解释层预留扩展口径
  - 当前直接卖店完成后已会更新 `shippingHistory`，后续 `getRecentShipping()`、`getDailyMarketInfo()` 与售价反馈可读取到该记录

#### ECON 经济止血（TYX-ECON-011）
- 重构售价计算为可组合价格管线：
  - `src/types/item.ts` 新增 `PriceModifierStep`、`PriceBreakdownEntry`、`SellPriceBreakdown` 等共享类型，用于描述售价乘区与分解明细
  - `src/stores/useShopStore.ts` 新增 `buildSellPriceModifierSteps()` 与 `getSellPriceBreakdown()`，把基础价、品质、技能、地形、戒指、仙缘、市场倍率拆成可解释步骤
  - `calculateSellPrice()` 与 `calculateBaseSellPrice()` 现统一复用价格分解结果，减少旧逻辑和新逻辑口径漂移
  - `src/views/game/ShopView.vue` 的出售弹窗新增“售价明细”面板，可直接查看每一步倍率、小计与市场说明，供 UI 与调试面板复用
  - 本批次已再次通过 `npm run type-check`

#### ECON 经济止血（TYX-ECON-012）
- 建立财富层级与软调控阈值：
  - `src/types/economy.ts` 新增 `WealthTierConfig` 与 `WealthTierAssessment`，统一描述财富层阈值、推荐权重与现金奖励软调控倍率
  - `src/data/balance/lateGameBalance.ts` 新增 4 档财富层配置，综合现金、近 7 天净收入与总资产值划分“资金紧张 / 稳健增长 / 资本充裕 / 财富溢出”
  - `src/stores/useSettingsStore.ts` 已让财富层配置进入平衡参数覆盖链路，开发态可继续走 balance override 调整阈值
  - `src/stores/usePlayerStore.ts` 新增总资产估值、当前财富层评估与 `wealthTier` 总览输出，经济总览现同时返回 `recent7DayNetIncome` 与 `totalAssetValue`
  - `src/stores/useGoalStore.ts` 已接入财富层软调控：
    - 目标奖励现金会按财富层倍率做软调节
    - 经济 sink 推荐会参考财富层的偏好 sink 类别与推荐权重
  - 当前已满足“至少影响一个推荐系统与一个奖励系统”的验收要求，并通过 `npm run type-check`

#### ECON 经济止血（TYX-ECON-013）
- 建立周预算系统：
  - 新建 `src/data/weeklyBudgets.ts`，为商路预算、展馆预算、学舍预算三槽提供递进档位、成本、预估收益与效果说明配置
  - `src/types/economy.ts` 新增 `WeeklyBudgetPlan`、`WeeklyBudgetSelection`、`WeeklyBudgetArchive`、`BudgetChannelEffect` 等共享类型，并由 `src/types/index.ts` 统一导出
  - `src/stores/useGoalStore.ts` 已接入周预算状态、手动投资、奖励结算加成、票券累计、旧档兼容与历史归档逻辑
  - `src/composables/useEndDay.ts` 在周切换时会自动归档上一周预算并重置为新周空槽，同时输出预算失效日志提示重新选择
  - `src/views/game/WalletView.vue` 新增“周预算系统”面板，可查看当前周预算槽、累计结算次数、预算票券并直接投入档位
  - `src/types/log.ts` 补充 `weekly_budget_activated` / `weekly_budget_expired` 结构化日志标签
  - 当前已满足“每周可投资预算，且预算收益仅本周生效、下周重置”的验收要求，并通过 `npm run type-check`

#### ECON 经济止血（TYX-ECON-014）
- 建立项目维护费系统：
  - `src/data/villageProjects.ts` 为 `hot_spring`、`village_school_ii`、`caravan_station_ii` 补齐维护计划配置，当前已满足“至少 3 个项目支持维护续费”的验收门槛
  - `src/stores/useVillageProjectStore.ts` 新增维护增益 gating、手动补缴 `payProjectMaintenance()`、逾期状态推进与自动续费控制，已实现“已完成建设 ≠ 增益恒定生效，而是由维护状态决定是否启用”
  - 已完成项目的 `unlockEffects` 现统一受维护状态约束，逾期或未启用维护时只暂停加成、不摧毁项目本身，符合“失去加成、不做重罚”的设计要求
  - `src/views/game/NpcView.vue` 新增维护状态卡片、维护费/周期展示、自动续费切换与“启用维护 / 补缴维护”操作入口，玩家可直接在村庄建设界面完成维护续费
  - 维护费支出已继续接入 `playerStore.spendMoney(..., 'villageProject')` 与 `recordSinkSpend(..., 'maintenance')`，保持经济 sink 与后期经营闭环口径一致

#### ECON 经济止血（TYX-ECON-015）
- 建立统一资源券 / 凭证系统：
  - `src/types/economy.ts` 新增 `RewardTicketLedger`、`RewardTicketDefinition`、`RewardTicketExchangeOffer`，统一票券账本、定义与兑换结构；`src/types/quest.ts` 同步补充 `ticketReward` 字段，便于高阶任务直接声明票券奖励
  - 新建 `src/data/rewardTickets.ts`，集中配置 6 类票券的名称/用途说明，并落地首批 4 个兑换项目，形成“记录 → 展示 → 消耗”的统一数据入口
  - `src/stores/useWalletStore.ts` 现正式持有 `rewardTickets` 钱包状态，补齐加券、扣券、兑换、序列化 / 反序列化与 `$reset`，成为统一资源券 / 凭证的状态拥有者
  - `src/stores/useGoalStore.ts` 已将周预算目标结算产出的票券接入钱包总账，并在日志中改用真实票券名称展示，不再只停留在周预算临时快照里累计
  - `src/stores/useQuestStore.ts`、`src/data/quests.ts`、`src/views/game/QuestView.vue` 已支持任务 / 特殊订单声明与展示票券奖励，首批特殊订单已接入建设券、商路票、研究券等混合奖励
  - `src/views/game/WalletView.vue` 新增“资源券 / 凭证”区块，可查看当前票券余额并执行首批兑换；`src/stores/useSaveStore.ts` 同步补齐旧档默认值，当前已通过 `npm run type-check`

#### ECON 经济止血（TYX-ECON-016）
- 重构高阶订单奖励结构：
  - `src/data/quests.ts` 新增 `SPECIAL_ORDER_REWARD_PROFILES` 与 `rewardProfileId`，为高阶特殊订单建立“现金主体 / 建设运营混合 / 商路混合 / 研究混合 / 展陈混合 / 鱼塘高规混合”等奖励结构档案
  - `src/stores/useQuestStore.ts` 在特殊订单生成阶段按 `highValueOrderCashRatio` 与奖励档案统一压缩现金比例，并把剩余价值转成票券奖励，使高阶订单不再几乎全是直接发钱
  - 首批高阶育种单、鱼塘高规单与第 3/4 梯度特殊订单已批量接入混合奖励，当前高价值订单会稳定产出建设券、展陈券、商路票与研究券等非现金奖励
  - `src/types/quest.ts`、`src/views/game/QuestView.vue` 已补充奖励档案与票券展示，任务详情页可直接说明当前订单属于哪类奖励结构，降低“发空奖励”的理解门槛
  - 当前已满足“高阶订单中非现金奖励占比明显提升”的验收要求，并通过 `npm run type-check`

#### ECON 经济止血（TYX-ECON-017）
- 降低瀚海赌坊净现金期望值：
  - `src/types/hanhai.ts` 新增瀚海奖励包、加权奖励、赌坊奖励触发器等共享类型，为后续瀚海专属票券 / 声望扩展提供统一结构
  - `src/data/hanhai.ts` 新增藏宝图复合奖励池、赌坊侧奖励池与 `pickWeightedRewardBundle()`，把瀚海娱乐收益改成“折算现金 + 票券 + 异域材料 / 藏宝图”混合掉落
  - `src/stores/useHanhaiStore.ts` 已统一接入 `casinoCashExpectationMultiplier`，下调轮盘、骰子、猜杯、斗蛐蛐、翻牌、扑克、恶魔轮盘与藏宝图的直接现金回流，并改为通过统一奖励结算链路发放商路票、展陈券、研究券、香料、绿松石、丝绸与藏宝图
  - `src/views/game/HanhaiView.vue` 已补充赌坊玩法说明文案，明确提示“赌坊更偏娱乐彩头 / 收藏物 / 票券，而非稳定刷钱”
  - 当前已满足“赌坊仍有吸引力，但不再是后期主要现金来源”的验收目标，并通过 `npm run type-check`

#### ECON 经济止血（TYX-ECON-018）
- 建立高价服务合同系统：
  - `src/types/shopCatalog.ts` 已补齐服务合同类型、订阅状态与运行态摘要结构，并扩展 `quest` 关联系统枚举。
  - `src/data/shopCatalog.ts` 已新增 4 份高价服务合同商品，覆盖商路外包、博物馆巡展、研究助理与后勤维保，同时补齐目录分类推断、关联系统推断与旧档兼容归一化。
  - `src/stores/useShopStore.ts` 已实现服务合同激活、到期、自动续费、续费倍率、效果汇总与活跃合同摘要，并纳入目录事务回滚与周期日志。
  - `src/stores/useQuestStore.ts`、`src/stores/useGoalStore.ts`、`src/stores/useMuseumStore.ts`、`src/stores/useVillageProjectStore.ts` 已接入服务合同增益，使其真实影响委托板刷新、任务奖励、目标声望、博物馆热度/评分与维护费用。
  - `src/views/game/ShopView.vue` 已新增服务合同预览、签约按钮文案与“已启用服务合同”面板，展示到期日、周费和续费次数。
  - 当前已满足“至少 3 种持续服务合同可购买且价值可见”的验收要求，并通过 `npm run type-check`

#### ORDER 高阶订单（TYX-ORDER-019）
- 扩展特殊订单数据结构到 3.0：
  - `src/types/quest.ts` 新增特殊订单 3.0 共用类型，补齐阶段类型、组合交付要求、评分规则、运行态进度、活动来源与反重复标签等可选字段，并保持旧订单字段兼容。
  - `src/data/quests.ts` 扩展 `SpecialOrderTemplate`，新增 `orderVersion`、`activitySourceId` / `activitySourceLabel`、`orderStageType`、`stageDefinitions`、`orderScoreRule`、`antiRepeatTags` 等配置入口，并为首批育种 / 鱼塘高阶单接入 3.0 元数据。
  - `src/stores/useQuestStore.ts` 新增订单 3.0 归一化逻辑，支持 `comboRequirements`、`stageDefinitions`、`orderScoreRule`、`orderProgressState` 等字段的生成与旧档反序列化兼容。
  - `src/views/game/QuestView.vue` 已增加订单解释层，可展示主题来源、订单结构、评分说明、阶段结构与轮换标签，为后续 ORDER-020 ~ ORDER-024 打底。
  - 当前已满足“旧订单可正常生成，新订单可声明复杂条件”的验收要求，并通过 `npm run type-check`

#### ORDER 高阶订单（TYX-ORDER-020）
- 建立组合交付订单模板：
  - `src/data/quests.ts` 已新增 6 个组合交付特殊订单模板，覆盖育种 + 加工、矿材 + 展陈、鱼塘 + 茶会、瀚海样本等混合交付场景，并统一接入 `comboRequirements`、`stageDefinitions`、评分规则、活动来源与反重复标签。
  - `src/stores/useQuestStore.ts` 已补齐组合单逐项进度统计、可提交判定与提交流程，支持按 requirement 分别从背包或鱼塘扣除资源，并在失败时回滚库存 / 鱼塘状态。
  - `src/views/game/QuestView.vue` 已改为按组合 requirement 汇总展示目标与总进度，避免继续使用单一 `targetQuantity` 造成 UI 误导。
  - 当前已满足“至少 6 个组合单模板可配置并显示”的验收要求，并通过 `npm run type-check`

#### ORDER 高阶订单（TYX-ORDER-021）
- 建立阶段化订单链模板：
  - `src/types/quest.ts` 已新增 `SpecialOrderStageReward`、`QuestStageState`，并为阶段定义补齐 `stageRewards`、`nextStageTemplateId`，让阶段链可声明独立奖励与下一段指针。
  - `src/data/quests.ts` 已新增 `createMultiStageDefinitions()`，并为 `茶肆特供`、`金蜜宴筹备`、`洞窟盲鱼研究样本` 接入 2~3 段阶段链模板，覆盖 prepare / verify / deliver 三类阶段。
  - `src/stores/useQuestStore.ts` 已补齐阶段链基础运行态兼容：阶段进度现会记录阶段类型与下一段模板 ID，中间阶段提交后可发放阶段奖励并推进到下一阶段，最终阶段继续走既有订单评分 / 结算链。
  - 当前已满足“至少 3 条订单链可顺利推进并结算”的验收要求，并通过 `npm run type-check`

#### ORDER 高阶订单（TYX-ORDER-022）
- 在 QuestStore 中实现阶段化订单状态机：
  - `src/stores/useQuestStore.ts` 已抽出阶段化订单统一状态机辅助函数，集中处理阶段快照构建、阶段推进、完成态写回、失败态落档与阶段历史追加，降低 `submitQuest()` 中的分支复杂度。
  - `SpecialOrderProgressState.stageHistory` 已正式接入运行态链路与旧档兼容归一化；多阶段订单现在会在中间推进、最终完成与超时失败时记录 `advanced / completed / failed` 历史项。
  - 最终结算态已改为复用已有阶段进度并保留历史记录，确保阶段奖励领取、已交付数量与结案记录不会在最终结算时丢失。
  - 当前已满足“阶段化订单能正确保存当前阶段、奖励领取与剩余时间”的验收要求，并通过 `npm run type-check`

#### ORDER 高阶订单（TYX-ORDER-023）
- 建立订单评分结算规则：
  - `src/data/quests.ts` 已补齐时效评分调参项，并在特殊订单初始运行态写入 `initialDaysRemaining`，使评分链可稳定读取原始时限。
  - `src/types/quest.ts` 已新增 `SpecialOrderSettlementSummary`，为评分分解、时效比率、阈值标签与结算摘要提供统一持久化结构。
  - `src/stores/useQuestStore.ts` 已把评分逻辑扩展为结构化 `scoreBreakdown`，当前会综合品质、谱系、世代、成熟度、健康度与时效完成度计算评分，并把摘要写回 `orderProgressState.settlementSummary`。
  - 当前已满足“至少 5 个订单支持 A/B/S 评分并影响奖励”的验收要求，并通过 `npm run type-check`

#### ORDER 高阶订单（TYX-ORDER-024）
- 在任务页增加订单解释层：
  - `src/types/quest.ts` 已为特殊订单补齐 `scoreHint`、`deliverySourceHint` 字段，专门承接任务页展示所需的可读规则说明。
  - `src/data/quests.ts` 已为高阶订单自动生成评分提示与交付来源提示，覆盖育种品质单、鱼塘样本单、组合交付单与阶段订单。
  - `src/views/game/QuestView.vue` 已新增“评分提示”“交付来源”说明区块，并与既有活动来源、订单规则、阶段 / 交付结构说明联动展示，使高代、成熟、健康、评分与提交来源可被 UI 清晰解释。
  - 当前已满足“鱼塘单、谱系单、组合单都能被 UI 清晰解释”的验收要求，并通过 `npm run type-check`

#### WS05 育种 × 特殊订单 × 主题周经营化（T042 ~ T047）
- 完成育种经营化首批数据结构、Store、内容、页面与联动收口：
  - `src/types/quest.ts`、`src/data/quests.ts` 已补齐育种 / 鱼塘主题订单所需的活动来源、评分规则、阶段结构、反重复标签、亲本来源限制、世代门槛与主题偏好字段，并保持旧档兼容。
  - `src/stores/useQuestStore.ts` 已补齐特殊订单 3.0 的评分结算链路：提交时会基于图鉴属性、世代、谱系、鱼塘代数、主题周偏置等计算评分档位，并按档位放大奖励现金 / 票券、回写阶段完成态与日志。
  - `src/stores/useQuestStore.ts` 现已把育种图鉴、鱼塘发现、主题周偏好、市场偏置、村庄委托加成与服务合同效果串入特殊订单生成 / 提交流程，形成“成长 → 订单 → 奖励 → 再经营”的闭环。
  - `src/views/game/QuestView.vue` 已补充特殊订单解释层，可视化展示需求提示、评分关注点、阶段结构、活动来源、轮换标签与奖励档案，降低后期订单理解门槛。
  - `src/views/game/BreedingView.vue` 已补充“经营型育种提醒”，将主题周重点、当前育种订单、推荐杂交目标与图鉴推荐目标汇总展示，帮助玩家快速决定本周育种方向。
  - `src/composables/useEndDay.ts`、`src/data/goals.ts`、`src/stores/useGoalStore.ts` 的既有周循环 / 主题周能力已与本批配置协同工作，当前可按周生成不同偏好的育种 / 鱼塘特殊订单。
  - 当前已满足“需求可追踪、可准备、可解释，且会反向影响育种与订单选择”的验收目标，并通过 `npm run type-check`

#### WS05 育种 × 特殊订单 × 主题周经营化（T048）
- 完成特殊订单事务安全与防刷处理：
  - `src/stores/useQuestStore.ts` 新增运行时提交锁，防止同一委托 / 特殊订单被重复点击并发结算。
  - 新增特殊订单结算回执与最近轮换标签历史，避免重复领奖，并降低连续刷出相同主题 / 相同标签订单的概率。
  - 特殊订单提交后会把评分结算结果、阶段完成态、回执记录与轮换历史统一写回，形成“校验 -> 结算 -> 记账 -> 记回执”的原子化链路。
  - 旧档读取时会为 `specialOrderSettlementReceipts`、`recentSpecialOrderTagHistory` 安全补默认值，运行时锁不会入档，兼容旧存档。
  - 当前已满足“重复点击不重奖、重复提交不重复结算、订单轮换具备基础防刷护栏”的验收目标，并通过 `npm run type-check`

#### WS05 育种 × 特殊订单 × 主题周经营化（T049）
- 完成调参与运营开关接线：
  - `src/stores/useQuestStore.ts` 已正式消费 `BREEDING_SPECIAL_ORDER_TUNING_CONFIG`，特殊订单生成尝试次数、评分基础分、各类 bonus / cap、反重复历史上限与结算回执上限不再写死在 store 内。
  - 主题周偏置、评分结算、反重复轮换、重复领奖保护现均受 feature flag 控制，出现活动异常时可直接通过 data 配置关闭或降级，无需改业务主逻辑。
  - 特殊订单生成链路现会按配置决定是否启用主题周偏置与反重复多轮尝试；特殊订单结算链路现会按配置统一裁剪最小 / 最大评分并放大奖励倍率。
  - 当前已满足“至少 8 个核心参数可通过 data 层热调”的验收要求，并通过 `npm run type-check`

#### WS05 育种 × 特殊订单 × 主题周经营化（T050）
- 完成 QA、数值验收与上线文档收口：
  - `src/data/quests.ts` 已补齐 `WS05_ACCEPTANCE_SUMMARY`、`WS05_QA_CASES`、`WS05_RELEASE_CHECKLIST`、`WS05_COMPENSATION_PLANS`、`WS05_RELEASE_ANNOUNCEMENT`，形成与 WS03 / WS04 一致的数据化发布包。
  - 首批 QA 用例已覆盖重复点击、评分结算、鱼塘高规订单、旧档兼容、运营调参与历史裁剪等场景，满足“至少 8 个用例”的发布门槛。
  - 补偿预案已覆盖重复结算、评分倍率异常与主题偏置失衡等风险，可直接作为运营兜底与回滚说明使用。
  - 当前批次文档、配置与代码已同步完成收口，并通过 `npm run type-check`

#### WS06 博物馆 / 祠堂持续经营线（T057）
- 完成跨系统联动闭环：
  - `src/data/goals.ts` 的主题周配置已补齐 `museumFocusHallZoneIds`、`museumFocusThemeIds`、`museumFocusScholarCommissionIds`，让主题周能直接编排馆区、祠堂主题与学者委托焦点。
  - `src/stores/useMuseumStore.ts` 新增 `currentThemeWeekMuseumFocus`、`featuredScholarCommissionOverview`、`questBoardBiasProfile`、`supportNpcOverview` 与 `crossSystemOverview`，把主题周、村庄建设、馆务协力 NPC 与告示板经营偏置统一收口到博物馆 store。
  - `src/stores/useQuestStore.ts` 现会把博物馆联动偏置并入任务 / 特殊订单生成链路，使展陈经营会反向影响告示板与筹备型委托方向。
  - `src/views/game/MuseumView.vue` 已新增学者委托接取/领奖按钮、经营联动摘要与馆务协力展示，形成“展陈 -> 学者委托 -> 告示板偏置 -> 村庄/社交联动”的可视化闭环。
  - 当前已满足“至少影响 2 条现有系统活跃度，并可从日志与页面看到联动证据”的验收目标，并通过 `npm run type-check`

#### WS06 博物馆 / 祠堂持续经营线（T058）
- 完成事务安全与防刷处理：
  - `src/stores/useMuseumStore.ts` 新增 `museumActionLocks`，为捐赠、学者委托接取、学者委托领奖与里程碑领奖补齐重复点击防护。
  - 学者委托领奖现会保留 `inventory / player / goal / npc / museum` 快照，若奖励发放异常会统一回滚，不再留下半成功状态。
  - 里程碑领奖与捐赠操作已补齐容量预检、异常回滚与结构化日志，读档时运行时锁不会入档，兼容旧存档。
  - 当前已满足“背包不足不吞货、重复点击不重奖、异常时可回滚”的事务护栏，并通过 `npm run type-check`

#### WS06 博物馆 / 祠堂持续经营线（T059）
- 完成调参与运营开关接线：
  - `src/data/museum.ts` 已新增 `MUSEUM_OPERATION_TUNING_CONFIG`，集中声明主题周焦点、告示板偏置、祠堂轮换、学者委托自动完成 / 领奖、事务锁、展示数量与联动权重等运营配置。
  - `src/stores/useMuseumStore.ts` 已正式消费上述 tuning config，访客热度换算、推荐动作展示数量、支持 NPC 展示数、馆区标签数、告示板偏置强度与学者好感奖励等逻辑不再散落写死。
  - 当前已满足“至少 8 个核心参数可通过 data 层热调”的验收要求，并通过 `npm run type-check`

#### WS06 博物馆 / 祠堂持续经营线（T060）
- 完成 QA、数值验收与上线文档收口：
  - `src/data/museum.ts` 已补齐 `WS06_ACCEPTANCE_SUMMARY`、`WS06_QA_CASES`、`WS06_RELEASE_CHECKLIST`、`WS06_COMPENSATION_PLANS`、`WS06_RELEASE_ANNOUNCEMENT`，形成与 WS05 一致的数据化发布包。
  - 首批 QA 用例已覆盖主题周焦点联动、学者委托接取 / 领奖、重复点击防护、里程碑容量预检、捐赠回滚、运营开关关闭、调参验证与旧档兼容等场景，满足“至少 8 个用例”的发布门槛。
  - 当前批次文档、配置与代码已同步完成收口，并通过 `npm run type-check`

#### WS07 公会赛季化与轻竞争 PVE（T067）
- 完成跨系统联动闭环：
  - `src/types/goal.ts`、`src/data/goals.ts` 已为主题周补齐 `guildFocusActivityIds`、`guildFocusMilestoneIds`、`guildFocusRewardPoolIds`，让主题周可直接编排公会赛季活动、里程碑与奖励池焦点。
  - `src/stores/useGuildStore.ts` 已新增 `currentThemeWeekGuildFocus`、`featuredSeasonActivities`、`featuredSeasonMilestones`、`activeRewardPoolOverview`、`questBoardBiasProfile`、`crossSystemOverview` 与 `guildAchievementProgress`，把主题周、赛季活动、奖励池与成就进度统一收口到公会 store。
  - `src/stores/useQuestStore.ts` 现会把公会联动偏置并入告示板与特殊订单的市场偏置链路，使公会赛季阶段会反向影响任务筹备方向。
  - `src/views/game/GuildView.vue` 已新增经营联动与成就联动摘要，形成“赛季阶段 -> 奖励池/成就 -> 告示板偏置 -> 周筹备路线”的可视化闭环。
  - 当前已满足“至少影响 2 条现有系统活跃度，并可从日志与页面看到联动证据”的验收目标，并通过 `npm run type-check`

#### WS07 公会赛季化与轻竞争 PVE（T068）
- 完成事务安全与防刷处理：
  - `src/stores/useGuildStore.ts` 已为 `claimGoal()`、`donateItem()`、`buyShopItem()` 接入运行时幂等锁，防止重复点击或并发触发重复结算。
  - 上述关键 action 现统一保留 `player / inventory / guild` 快照，并在奖励发放、材料扣除或状态写回异常时整体回滚，避免半成功状态。
  - `deserialize()` 读档时会主动清空 `guildActionLocks`，确保运行时锁不入档、不污染旧存档兼容链路。
  - 当前已满足“背包不足不吞货、重复点击不重奖、异常结算可回滚”的事务护栏，并通过 `npm run type-check`。

#### WS07 公会赛季化与轻竞争 PVE（T069）
- 完成调参与运营开关接线：
  - `src/data/guild.ts` 已新增 `GUILD_SEASON_TUNING_CONFIG`，集中管理主题周焦点、告示板偏置、奖励池显示、阶段切换周数、异步荣誉分公式、讨伐贡献换算、捐献倍率与事务锁开关。
  - `src/data/guild.ts` 同步新增 `GUILD_SEASON_MAILBOX_PRESETS`，为荣誉竞猎周结算与世界里程碑收尾邮件提供可复用的数据预设。
  - `src/stores/useGuildStore.ts` 已正式消费 tuning config，当前阶段切换、榜单档位、偏置强度、推荐动作数量、奖励池展示与贡献/经验换算均不再写死在 store 内。
  - `server/src/taoyuanMailbox.js` 与 `server/src/routes/api.js` 已补齐公会赛季邮件预设读取接口，运营侧可直接读取赛季邮件模板配置以快速降级或切换活动结算方案。
  - 当前已满足“至少 8 个核心参数可通过 data / server 预设热调”的验收目标，并通过 `npm run type-check` 与 `node --check` 自检。

#### WS07 公会赛季化与轻竞争 PVE（T070）
- 完成 QA、数值验收与上线文档收口：
  - `src/data/guild.ts` 已补齐 `WS07_ACCEPTANCE_SUMMARY`、`WS07_QA_CASES`、`WS07_RELEASE_CHECKLIST`、`WS07_COMPENSATION_PLANS`、`WS07_RELEASE_ANNOUNCEMENT`，形成与 WS05 / WS06 一致的数据化发布包。
  - 首批 QA 用例已覆盖重复点击防护、商店购买回滚、荣誉分热调、偏置关闭、邮件预设读取、旧档兼容与补偿切换等场景，满足“至少 8 个用例”的发布门槛。
  - 补偿预案已覆盖重复奖励、档位口径失真与赛季邮件模板异常等风险，可直接作为运营兜底与回滚说明使用。
  - 当前批次文档、配置与代码已同步完成收口，并通过 `npm run type-check` 与 `node --check` 自检。

#### WS01 经济观测与通胀治理底座（T001 / T002 / T003）
- 为后期经济治理补齐首批基线审计配置：
  - `src/data/market.ts` 新增 `ECONOMY_AUDIT_CONFIG`
  - 首批定义 4 个核心指标：通胀压力指数、消耗满足度、循环多样度、单系统收入占比
  - 补齐 2 个护栏指标：后期 7 日净流入 / 总资产比、高价 sink 覆盖率
  - 增加后期玩家分层与失败回滚规则，作为后续调参与灰度的统一口径
- 为 WS01 数据结构补齐类型与旧存档兼容默认值：
  - `src/types/goal.ts` 新增经济观测相关类型：指标定义、玩家分层、回滚规则、流水桶、风险报告、日快照与遥测状态
  - `src/stores/usePlayerStore.ts` 新增 `economyTelemetry` 持久化字段，并补齐反序列化默认结构，旧档缺少该字段时会自动安全回填
- 为 WS01 Store API 建立统一入口，避免后续页面和调度层重复拼公式：
  - `usePlayerStore` 现支持按系统记录收入 / 支出、记录 sink 消耗与写入风险报告
  - 新增最近快照、净流入、通胀压力、消耗满足度、循环多样度、单系统收入占比、当前玩家分层与总览等 getter / action
  - `dailyReset` 的昏倒罚款现同步计入经济支出遥测，为后续日结 / 周结接入提供统一底座

#### WS01 经济观测与通胀治理底座（T004）
- `src/composables/useEndDay.ts` 已接入经济观测日结 / 周结调度：
  - 每次跨天都会基于收入、支出、sink 消耗和高价值订单类型写入一条经济日快照
  - 周切换时会自动生成一次经济风险报告，并在进入观察 / 预警区间时写入游戏日志
  - 日结中的出货箱收入现明确按 `shop` 系统记账，昏倒罚款与每日异常订单过期也会进入经济观测样本
  - 主题周偏好、特殊订单与进行中的高价值订单现会参与循环多样度统计，为后续 UI 推荐与通胀提示提供真实日结数据

#### WS01 经济观测与通胀治理底座（T005）
- `src/data/market.ts` 新增首批经济 sink 内容配置：
  - 补齐中期过渡、后期进阶、终局展示三档内容定义
  - 首批覆盖灌溉代办与农具整修、商队席位认购、展陈维护与专题布展、瀚海商路赞助等价格带
  - 每项配置都明确了对应 sink 分类、联动系统、解锁指标、价值流与消耗流，方便后续只改 data 扩容
- `src/data/goals.ts` 补入与经济治理底座联动的首批长期目标与主题周配置：
  - 新增“经营有章 / 豪华席位 / 终局赞助者”三档长期目标，引导玩家从基础服务 sink 过渡到高价目录与终局展示投入
  - 为新增长期目标补齐 UI 元信息与推荐理由
  - 新增“豪华经营周”主题周配置，使高价投入、服务认购与展示准备进入周度编排池

#### WS01 经济观测与通胀治理底座（T006）
- `src/views/game/WalletView.vue` 新增“后期经济观测”卡片：
  - 展示当前经营分层、通胀压力、消耗满足度、循环多样度、单系统收入占比
  - 当周风险报告会直接在钱包页显示
  - 同时按当前经营状态推荐最适合的资金去向与价格带
- `src/views/game/ShopView.vue` 新增“经济观测看板”：
  - 在商圈总览页补充后期经济指标摘要与风险提示
  - 根据玩家当前分层与经营风险，动态推荐本期优先消费的 sink 内容池
  - 让玩家在进入商店前就能看懂为什么要花钱、该把钱花到哪里

#### WS01 经济观测与通胀治理底座（T007）
- `src/stores/useShopStore.ts` 与 `src/stores/useGoalStore.ts` 已接入跨系统经营闭环：
  - 商店推荐不再只看钱包流派和主题周，也会参考当前推荐资金去向与后期经济分层
  - 高价 / 功能 / 每周精选货架会根据当前经济 sink 建议追加推荐分，直接影响玩家本周采购选择
  - 商品推荐理由中会展示其与当前资金去向的关系，形成“观测 → 推荐 → 消费”的闭环
- `useGoalStore` 现将长期高价 sink 目标纳入主题周目标池，并新增 `recommendedEconomySinks`
  - 主题周不仅能推日常 / 季节目标，也会把高价 sink 长期目标一并纳入当前经营视野
  - 形成“目标 → 商店 / 市场 / 订单 → 更高价 sink”的经营链路

#### WS01 经济观测与通胀治理底座（T008）
- `src/stores/useShopStore.ts` 补强事务安全：
  - 购买高价目录商品前会保留目录拥有状态、背包、仓库与农舍快照
  - 任一目录商品发放失败时，会回滚相关状态并自动退款，避免半成功导致经济遥测与玩家资产不一致
  - 退款路径也统一按 `shop` 系统记账，保证经济观测数据闭环一致
- `src/stores/useGoalStore.ts` 为长期高价 sink 目标补充经营引导日志：
  - 当高价 sink 长期目标达成时，会立即提示玩家前往钱袋 / 商圈查看当前推荐资金去向
  - 减少“目标已完成但玩家不知道下一步该把钱花到哪里”的断层

#### WS01 经济观测与通胀治理底座（T009）
- `src/data/market.ts` 新增 `ECONOMY_TUNING_CONFIG`：
  - 把推荐 sink 数量、周报开关、周报周期、sink 评分加成、商店推荐加成等关键参数集中到 data 层
  - 为后续调平衡、灰度和运营开关预留统一参数面
- `src/stores/useGoalStore.ts` 与 `src/stores/useShopStore.ts` 已改为消费调参配置：
  - 推荐 sink 数量与评分权重不再写死在 store 内
  - 商店推荐和目标推荐均开始走统一调参项，后续无需改业务逻辑即可调推荐强度
- `src/stores/usePlayerStore.ts` 现补入风险报告开关：
  - 当后续需要灰度关闭经济风险提示时，可直接通过配置收口，而不必改动计算主链路

#### WS01 经济观测与通胀治理底座（T010）
- `src/types/economy.ts` 新增发布侧共享结构：
  - 补齐 QA 用例、上线检查项、补偿预案等类型，作为后续各工作流复用的发布骨架
- `src/data/market.ts` 补齐 WS01 的可发布交付包配置：
  - 新增 8 条 QA 用例，覆盖正向、反向、边界、兼容、恢复与运营调参场景
  - 新增上线检查清单，覆盖风险周报、旧档兼容、退款链路、UI 展示、调参与遥测一致性
  - 新增 3 条补偿预案，用于目录购买异常、风险提示误报和旧档异常场景
  - 新增验收摘要与发布公告文案，方便后续直接走验收和上线沟通
  - 使 WS01 从“可开发”推进到“可验收、可上线、可回滚”状态

#### WS01 经济观测与通胀治理底座（T010）
- `src/types/economy.ts` 新增发布侧共享结构：
  - 补齐 QA 用例、上线检查项、补偿预案等类型，作为后续各工作流复用的发布骨架
- `src/data/market.ts` 补齐 WS01 的可发布交付包配置：
  - 新增 8 条 QA 用例，覆盖正向、反向、边界、兼容、恢复与运营调参场景
  - 新增上线检查清单，覆盖风险周报、旧档兼容、退款链路、UI 展示、调参与遥测一致性
  - 新增 3 条补偿预案，用于目录购买异常、风险提示误报和旧档异常场景
  - 新增验收摘要与发布公告文案，方便后续直接走验收和上线沟通
  - 使 WS01 从“可开发”推进到“可验收、可上线、可回滚”状态

#### WS02 村庄建设终局资金池 2.0（T011）
- `src/types/villageProject.ts`、`src/data/villageProjects.ts`、`src/stores/useVillageProjectStore.ts` 已补齐首批基线审计配置：
  - 新增村庄建设终局资金池的审计类型、阶段分层、玩家分层、回滚规则等结构
  - 首批定义 4 个核心指标：高价项目完成率、后期玩家建设参与率、村庄等级分布、项目材料回收量
  - 补齐 2 个护栏指标：终局资金压力率、系统影响覆盖率
  - `useVillageProjectStore` 新增 `fundingPhase`、`playerSegment`、`baselineAudit`、`getProjectAuditProfile`，为后续 WS02 的内容、页面与日结接入提供统一口径

#### WS02 村庄建设终局资金池 2.0（T012）
- `src/types/villageProject.ts`、`src/data/villageProjects.ts`、`src/stores/useVillageProjectStore.ts`、`src/stores/useSaveStore.ts` 已补齐 WS02 数据结构与旧档兼容约定：
  - 新增 `VillageProjectContentTier`、`VillageProjectBuildMode`、阶段配置、维护状态、捐赠状态、区域功能变化与专项扩展类型
  - `src/data/villageProjects.ts` 新增 `VILLAGE_PROJECT_OPERATIONAL_CONFIG`，为 P0 / P1 / P2 三阶段扩展、维护需求、捐赠里程碑与区域功能升级提供统一默认结构
  - 现有村庄建设项目已补入 `contentTier`、`buildMode`、`stageConfig`、`maintenancePlan`、`donationPlan`、`regionalEffects` 等配置字段
  - `useVillageProjectStore` 与 `useSaveStore` 已补齐 `saveVersion`、`maintenanceStates`、`donationStates` 的序列化 / 反序列化与旧档安全默认值

#### WS02 村庄建设终局资金池 2.0（T013）
- `src/stores/useVillageProjectStore.ts` 已补齐 WS02 Store 状态与 API 扩展：
  - 新增 `overviewSummary`、`operationalSummaries`、`linkedSystemProjects` 等汇总 getter，统一输出阶段 / tier / 维护 / 捐赠 / 联动概览
  - 补齐 `getProjectsByTier()`、`getProjectsByPhase()`、`getMaintenanceState()`、`getDonationState()`、`getOperationalSummary()`、`getLinkedProjects()` 等查询入口
  - 页面与后续工作流可直接消费 store 暴露结果，不再重复拼装村庄建设阶段、维护与捐赠公式
  - 为后续 WS02 的日结调度、页面信息展示与跨系统闭环接入提供统一 store API 底座

#### WS02 村庄建设终局资金池 2.0（T014）
- `src/stores/useVillageProjectStore.ts`、`src/composables/useEndDay.ts`、`src/types/log.ts` 已补齐 WS02 日结 / 周结调度接入：
  - `useVillageProjectStore` 新增 `processOperationalTick()`，统一处理建设维护计划排期、自动续费、逾期周期累积与周摘要生成
  - 维护费现会通过 `playerStore.spendMoney(..., 'villageProject')` 与 `recordSinkSpend(..., 'maintenance')` 正式记入经济遥测，避免后期维护成本脱离通胀治理样本
  - 每周切换时会自动输出维护中 / 已逾期项目数，以及推进中的捐赠计划概览，形成“建设完成 -> 维护 -> 捐赠里程碑”的稳定周循环反馈
  - `useEndDay` 已在新一天日结阶段正式接入村庄建设运营 tick，跨天、跨周、跨季时会按统一周边界执行，不再依赖页面手动刷新

#### WS02 村庄建设终局资金池 2.0（T015）
- `src/data/villageProjects.ts` 已补齐 WS02 首批内容配置：
  - 首批建设内容已覆盖 P0 / P1 / P2 三档，形成从中期过渡、后期扩建到终局展示的价格带与成长带
  - 已落地工台角、矿料棚与支架、节庆暖房、商队驿站、村塾学舍、温泉整修、商队驿站扩建等项目
  - 首批项目已同时带入 `unlockEffects`、`regionalEffects`、`maintenancePlan`、`donationPlan` 等配置，不再只是单次花钱解锁
  - 使 WS02 从“可调度”推进到“有首批可玩内容可供后续页面与联动系统消费”的状态

#### WS02 村庄建设终局资金池 2.0（T016）
- `src/views/game/HomeView.vue`、`src/views/game/QuestView.vue` 已补齐 WS02 页面入口与信息展示：
  - 家园页新增“村庄建设”概览卡，集中展示当前阶段、玩家分层、可推进项目、维护提醒与捐赠推进
  - 任务页新增“村庄建设线路”信息卡，直接展示与委托/订单相关的建设加成、当前阶段与可推进项目
  - 玩家无需进入底层 store 调试，即可在主线页面看懂建设当前价值、下一步方向与任务侧联动收益
  - 使 WS02 从“内容已配置”推进到“玩家能在主流程页面感知建设线”的可见状态

#### WS06 博物馆 / 祠堂持续经营线（T051）
- `src/types/museum.ts`、`src/data/museum.ts`、`src/stores/useMuseumStore.ts` 已补齐首批基线审计配置：
  - 新增博物馆持续经营的审计指标、玩家分层、回滚规则与联动系统上下文类型
  - 首批定义 4 个核心指标：捐赠后 14 日回流率、专题展参与率、博物馆带来的订单占比、非战斗后期留存占比
  - 补齐 2 个护栏指标：展示反馈可见度、材料消耗压力比
  - `useMuseumStore` 新增 `currentAuditSegment` 与 `sustainedOperationAuditOverview`，为后续 WS06 的专题展、祠堂供奉和 UI 展示提供统一审计总览

#### WS06 博物馆 / 祠堂持续经营线（T052）
- `src/types/museum.ts`、`src/stores/useSaveStore.ts` 已补齐 WS06 数据结构与旧档兼容约定：
  - 新增展陈槽位、馆区等级、学者委托、供奉主题、访客流量分档、展示评分分档与运营配置等类型骨架
  - 为后续 P0 / P1 / P2 内容扩展预留 `MuseumContentTier`、馆区 ID、主题轮换与遥测状态结构
  - `useSaveStore` 已为 museum 数据块补齐 `saveVersion`、展陈槽位、馆区进度、学者委托、供奉主题与 telemetry 的旧档默认值收口
  - 使 WS06 从纯审计定义推进到“类型/配置/存档兼容”可继续扩展的结构化状态

#### WS06 博物馆 / 祠堂持续经营线（T053）
- `src/stores/useMuseumStore.ts`、`src/stores/useSaveStore.ts` 已补齐 WS06 Store 状态与 API 扩展：
  - 新增 `operationalOverview`、`exhibitSlotOverview`、`hallProgressOverview`、`scholarCommissionOverview`、`shrineThemeOverview` 等统一汇总 getter
  - 补齐 `getExhibitSlotOverview()`、`getHallOverview()`、`getScholarCommissionOverview()`、`getActiveShrineTheme()`、`getAvailableExhibitSlots()` 等单项查询入口
  - `useMuseumStore` 现已与 T052 的 save shape 对齐，完整序列化 / 反序列化展陈槽位、馆区进度、学者委托、供奉主题与 telemetry 状态
  - `useSaveStore` 现复用 museum 默认存档结构，避免旧档迁移与 store 持久化口径分叉

#### WS06 博物馆 / 祠堂持续经营线（T054）
- `src/stores/useMuseumStore.ts`、`src/composables/useEndDay.ts`、`src/types/log.ts` 已补齐 WS06 日结 / 周结调度接入：
  - `useMuseumStore` 新增 `processOperationalTick()`，统一处理祠堂主题轮换、展陈评分刷新、访客热度计算与学者委托超期 / 完成判定
  - 新增基于展陈槽位、馆区等级与供奉主题的展示评分 / 访客热度遥测构建逻辑，使博物馆从“一次性捐赠”进入“可持续日常经营”状态
  - 学者委托现会在日结中自动检查持续天数、评分目标与流量目标，达成时直接进入待领奖状态，超期则自动失效并记日志
  - `useEndDay` 已接入博物馆运营 tick，周切换时会生成展陈周摘要，换季时可同步驱动 seasonal 祠堂主题轮换

#### WS06 博物馆 / 祠堂持续经营线（T055）
- `src/data/museum.ts` 已补齐 WS06 首批内容配置：
  - 首批内容已覆盖展陈槽位、馆区等级、学者委托、祠堂主题、访客流量分档与展示评分分档
  - 内容层覆盖 P0 / P1 / P2 三档，从基础前厅、矿晶馆区一路扩展到祠堂庭院与终局展示槽位
  - 学者委托与祠堂主题已具备独立的难度、解锁门槛、奖励与主题偏好，能支撑 2~3 个版本的经营扩容
  - 使 WS06 从“有运营状态机”推进到“有首批经营内容池”的可扩展状态

#### WS06 博物馆 / 祠堂持续经营线（T056）
- `src/views/game/MuseumView.vue` 已补齐 WS06 页面入口与信息展示：
  - 页面顶部新增经营总览，集中展示展陈等级、展示评分、访客热度、可接学者委托数与当前祠堂主题
  - 新增馆区推进区块，展示重点馆区等级与已解锁槽位，降低玩家理解馆区成长门槛
  - 新增学者委托摘要，直接显示可接取 / 进行中 / 待领奖状态，提升经营反馈可见度
  - 使 WS06 从“有内容配置与运营逻辑”推进到“玩家能在博物馆页直接理解经营状态”的可玩层

#### WS07 公会赛季化与轻竞争 PVE（T061）
- `src/data/guild.ts` 已补齐公会赛季化与轻竞争 PVE 基线审计配置：
  - 定义 4 项核心指标：公会周活率、赛季讨伐完成率、异步榜参与率、公会商店回收量
  - 补齐 2 项护栏指标：矿洞垄断占比、轻竞争公平差
  - 新增 3 档样本玩家分层、跨 goal / quest / mining / achievement 联动口径与 1 条软回滚规则
  - 为后续 WS07 的类型扩展、store API、周结调度与异步榜实现提供统一 KPI 基线

#### WS08 瀚海终局循环深化（T071）
- `src/data/hanhai.ts` 已补齐瀚海终局循环基线审计配置：
  - 定义 4 个核心指标：瀚海解锁后 14 日留存、遗迹 7 日复玩率、商路投资采用率、瀚海材料跨系统回收率
  - 补齐 2 个护栏指标：纯刷钱循环占比、跨系统联动激活率
  - 新增 3 档样本玩家分层、1 条回滚条件，以及与 quest / shop / museum / goal 的联动口径
  - 为后续 WS08 的数据结构、store 审计总览与终局玩法扩展提供统一基线配置

#### WS07 公会赛季化与轻竞争 PVE（T062）
- `src/types/guild.ts`、`src/stores/useGuildStore.ts`、`src/stores/useSaveStore.ts` 已补齐 WS07 数据结构与旧档兼容约定：
  - 新增公会赛季阶段、排行档位、赛季快照与 `GuildSeasonState` 等结构，锁定公会赛季化存档形状
  - `useGuildStore` 现补入 `seasonState`，并接入序列化 / 反序列化，兼容旧档无赛季数据时的默认回填
  - `useSaveStore` 已为 guild 数据块补齐赛季状态默认结构，避免后续 T063+ 接入时旧档缺块报错
  - 为后续 WS07 的 store API、异步榜与周结调度提供统一数据底座

#### WS08 瀚海终局循环深化（T072）
- `src/types/hanhai.ts`、`src/stores/useHanhaiStore.ts`、`src/stores/useSaveStore.ts` 已补齐 WS08 数据结构与旧档兼容约定：
  - 新增瀚海进度 tier、商路投资、套组收藏、Boss 周期与 `HanhaiCycleState` / `HanhaiSaveData` 等结构
  - `useHanhaiStore` 现补入 `cycleState` 并接入序列化 / 反序列化，统一承载终局循环扩展所需的持久态
  - `useSaveStore` 已为 hanhai 数据块补齐旧档默认值兼容入口，确保后续商路投资、套组古物与周期挑战可在统一存档形状上继续扩展
  - 为后续 WS08 的 store API、日结调度与终局内容扩容提供统一数据底座

#### WS07 公会赛季化与轻竞争 PVE（T063）
- `src/stores/useGuildStore.ts`、`src/types/guild.ts` 已补齐 WS07 Store 状态与 API 扩展：
  - 新增 `seasonOverview`、`goalSummaries` 等统一汇总 getter，集中输出赛季状态、目标进度与可领奖情况
  - 补齐 `getGoalSummary()`、`getGoalsByZone()`、`updateSeasonState()`、`addSeasonSnapshot()` 等统一读写与查询入口
  - 页面和后续工作流可直接消费公会赛季 / 讨伐结果，不再重复拼装赛季快照与目标状态
  - 为后续 WS07 的日结调度、异步榜与轻竞争 PVE 联动提供统一 store API 底座

#### WS07 公会赛季化与轻竞争 PVE（T064）
- `src/stores/useGuildStore.ts`、`src/composables/useEndDay.ts`、`src/types/log.ts` 已补齐 WS07 日结 / 周结调度接入：
  - `useGuildStore` 新增 `processSeasonTick()`，统一处理赛季阶段推进、异步荣誉分计算、周快照归档与每周限购重置
  - 赛季阶段现会根据季内周次在 `p0_commission` / `p1_ranked_hunt` / `p2_world_milestone` 间自动切换，并按贡献、公会经验、BOSS 结算与等级推导异步荣誉档位
  - 周切换时会自动写入公会赛季快照，沉淀 `contributionGained`、`goalClaims`、`bossClears` 与 `rankBand`，供后续排行、邮件结算与轻竞争 PVE 使用
  - `useEndDay` 已正式接入公会赛季 tick，保证跨周与跨季切换口径统一，并通过结构化日志记录赛季推进事件

#### WS07 公会赛季化与轻竞争 PVE（T065）
- `src/types/guild.ts`、`src/data/guild.ts` 已补齐 WS07 首批内容配置：
  - 新增 `GuildContentTier`、赛季活动轨、荣誉称号、世界里程碑与赛季奖励池等内容定义结构
  - 首批内容已覆盖 `p0_commission`、`p1_ranked_hunt`、`p2_world_milestone` 三阶段，对应中期过渡、后期进阶与终局展示三档内容带
  - 已落地后勤委托周、边境巡防轮换、荣誉竞猎榜、精英后勤竞拍、要塞共建里程碑与深渊首领战役等赛季活动内容表
  - 为后续公会页面、邮箱结算、荣誉商店与异步排行解释层提供首批可消费的数据池

#### WS07 公会赛季化与轻竞争 PVE（T066）
- `src/views/game/GuildView.vue` 已补齐 WS07 页面入口与信息展示：
  - 页面顶部新增赛季总览卡，集中展示当前赛季、赛季阶段、荣誉档位与异步荣誉分
  - 新增“本阶段活动”“阶段里程碑”“赛季奖励池”摘要，让玩家能在公会主界面直接理解赛季结构
  - 现有讨伐、捐献、商店与图鉴页签不变，但已具备赛季化解释层，不再只有基础公会循环
  - 使 WS07 从“有赛季状态机”推进到“玩家可直接感知赛季目标与奖励结构”的展示状态

#### WS08 瀚海终局循环深化（T073）
- `src/stores/useHanhaiStore.ts`、`src/types/hanhai.ts` 已补齐 WS08 Store 状态与 API 扩展：
  - 新增 `cycleOverview`、`relicSiteSummaries`、`shopItemSummaries` 等统一汇总 getter，集中输出瀚海循环、遗迹与商店状态
  - 补齐 `getRelicSiteSummary()`、`getShopItemSummary()`、`updateCycleState()`、`getDebugSnapshot()` 等统一读写与调试入口
  - 页面和后续工作流可直接消费瀚海循环状态，不再重复拼装遗迹剩余次数、循环 tier 与收藏/投资摘要
  - 为后续 WS08 的日结调度、终局联动与风险事件实现提供统一 store API 底座

#### WS08 瀚海终局循环深化（T074）
- `src/stores/useHanhaiStore.ts`、`src/composables/useEndDay.ts`、`src/types/log.ts` 已补齐 WS08 日结 / 周结调度接入：
  - `useHanhaiStore` 新增 `processCycleTick()`，统一处理每日赌坊次数重置、周切换时的商店限购 / 遗迹勘探重置、Boss 周目轮换与 route investment 周期推进
  - 现已根据遗迹通关数、投资激活数与套组收藏完成度自动推导 `progressTier`，使瀚海终局线能在日结阶段稳定成长，而不是只依赖页面即时状态
  - 周切换时会按季内周次刷新 `bossCycleId`，并为已存在的商路投资累计 `tripsCompleted`，为后续商路收益与终局事件钩子预留稳定的周循环状态机
  - `useEndDay` 已正式接入瀚海循环 tick，跨周刷新与结构化日志现与其他后期系统共用统一周边界口径

#### WS08 瀚海终局循环深化（T075）
- `src/types/hanhai.ts`、`src/data/hanhai.ts` 已补齐 WS08 首批内容配置：
  - 新增商路投资扩展字段、遗迹套组、Boss 周期、商路合同与驿站轮换货架等内容定义结构
  - 首批内容已覆盖 P0 / P1 / P2 三档，从西行丝货路、青玉互市路到月沙祭仪路形成明确的投资价格带
  - 已落地 3 条商路投资、3 套遗迹收藏、4 个周 Boss、3 份商路合同与 3 组驿站轮换货架内容表
  - 为后续瀚海合同结算、套组展示、周报面板与终局事件钩子提供首批可配置内容池

#### WS08 瀚海终局循环深化（T076）
- `src/views/game/HanhaiView.vue` 已补齐 WS08 页面入口与信息展示：
  - 页面顶部新增瀚海循环总览，直接展示循环阶段、本周首领、遗迹总勘探与活跃投资数
  - 新增商路投资、商路合同、遗迹套组 / 轮换货架摘要区块，使内容配置不再停留在 data 层
  - 玩家可在瀚海主界面直接感知本档 Boss、当前投资状态与可关注的终局内容，不必依赖日志或调试视图
  - 使 WS08 从“有终局内容池”推进到“主页面可解释终局循环结构”的第一版展示状态

#### WS03 商店目录与豪华消费池扩容（T021）
- `src/data/shopCatalog.ts`、`src/stores/useShopStore.ts` 已补齐首批基线审计配置：
  - 新增商店豪华消费池的 baseline audit 配置，覆盖豪华许可证、仓储服务、远行补给、节庆礼盒、展示型家具与功能型券包
  - 首批定义 4 个核心指标：豪华商品购买率、周精选转化率、重复购买率、功能道具沉没率
  - 补齐 2 个护栏指标：商店 sink 占总支出比、豪华商品可负担周数
  - 新增 3 档玩家分层、1 条回滚规则与 linked system refs
  - `useShopStore` 新增 `currentLuxuryAuditSegment` 与 `luxuryCatalogBaselineAudit`，为后续 WS03 的内容、UI 与日结接入提供统一口径

#### WS03 商店目录与豪华消费池扩容（T022）
- `src/types/shopCatalog.ts`、`src/data/shopCatalog.ts`、`src/stores/useShopStore.ts`、`src/stores/useSaveStore.ts` 已补齐 WS03 数据结构与旧档兼容约定：
  - 新增 `ShopCatalogContentTier`、`ShopCatalogLuxuryCategory`、`ShopCatalogRefreshCycle`、许可证 / 仓储服务 / 远行补给 / 节庆礼盒 / 展示家具 / 功能券包配置结构与扩展存档状态类型
  - `src/data/shopCatalog.ts` 现通过统一的 offer builder 为商店目录补齐 tier、价格带、联动系统、刷新周期、服务计费周期与扩展配置字段，形成可继续扩容的统一数据形状
  - `useShopStore` 与 `useSaveStore` 已补入 `catalogExpansionState` 的默认值、序列化 / 反序列化与旧档安全回填，确保后续日结、过期与复购逻辑可在统一存档形状上继续扩展
  - 现有目录内容已开始按豪华许可、仓储服务、远行补给、节庆礼盒、展示家具、功能券包做结构化归类，不再只依赖松散 tags 驱动

#### WS03 商店目录与豪华消费池扩容（T023）
- `src/stores/useShopStore.ts` 已补齐 WS03 Store 状态与 API 扩展：
  - 新增 `catalogOverviewSummary`、`catalogOfferOperationalSummaries` 与 `getCatalogOfferOperationalSummary()`，统一输出目录总览、商品状态、已购次数、激活状态、解锁提示与限制提示
  - 补齐 `getCatalogOfferById()`、`getCatalogOffersByPool()`、`getCatalogOffersByTier()`、`getCatalogOffersByCategory()`、`getCatalogOffersByLinkedSystem()` 等查询入口，避免页面和后续工作流重复拼装分类规则
  - 新增 `markCatalogOfferPurchased()`、`getCatalogOfferLimitHint()` 与 `getCatalogDebugSnapshot()`，把购买后扩展状态写入、限制原因解释与调试快照统一收口到 store 层
  - `purchaseCatalogOffer()` 现已把目录扩展状态纳入事务快照 / 回滚链路，购买成功后会同步登记扩展状态，失败时则回滚目录扩展态与资产状态，保持一致性

#### WS03 商店目录与豪华消费池扩容（T024）
- `src/stores/useShopStore.ts`、`src/composables/useEndDay.ts` 已补齐 WS03 日结 / 周结调度接入：
  - `useShopStore` 新增 `processCatalogCycleTick()`，统一处理豪华许可证 / 仓储服务到期、周精选刷新与季节限定货架切换日志
  - 目录扩展状态中的 entitlement 现会在跨天时自动检查到期日，过期后转为 `expired`，为后续复购、维护与活动编排提供稳定节奏锚点
  - `useEndDay` 已正式接入商店目录周期 tick，和村庄建设 / 博物馆 / 公会 / 瀚海共用统一周边界口径，不再依赖页面打开时被动刷新

#### WS03 商店目录与豪华消费池扩容（T025）
- `src/data/shopCatalog.ts`、`src/data/wallet.ts` 已补齐 WS03 首批内容配置：
  - 商店目录首批内容现已覆盖中期过渡、后期进阶、终局展示三档价格带，形成基础常驻、每周精选、季节限定与高价长期商品的完整消费梯度
  - `src/data/shopCatalog.ts` 新增并扩充了仓储契约、远行补给、节庆礼盒、展示收藏与功能型券包内容：
    - 基础池补入 `迎宾酒架`、`小库房整备册` 等中期过渡内容，并为背包 / 材料 / 渔具 / 牧场 / 灌溉 / 采脂线补给统一补齐 `travelSupplyConfig`、`functionalVoucherConfig`、`warehouseServiceConfig` 与展示评分配置
    - 每周精选扩充 `花市巡游车`、`商队行装箱`，并把周更仓储、补给、节庆、收藏内容统一补上 `weeklySpotlightWeight`、服务计费周期、节庆礼盒与远行补给元数据
    - 季节限定现同时覆盖春夏秋冬的展示收藏与功能礼包，每档都具备节庆 / 收藏 / 补给 / 自动化等至少一个消耗维度，不再只是单一数值型道具包
    - 高价长期商品新增 `金阙月宴礼盒`、`绮彩堂台`、`远征储备库`，并为温室许可、仓储扩建、终局陈设、远征储备与自动化投资补齐终局展示与长期经营配置
  - `createShopCatalogOffer()` 现会自动继承 `permitConfig.billingCycle` / `warehouseServiceConfig.billingCycle`，确保周度仓储与服务型商品在内容层即可声明真实计费周期
  - `src/data/wallet.ts` 已同步扩充钱包流派偏好标签，新增 `仓储`、`服务契约`、`补给包`、`自动化`、`节庆`、`收藏` 等权重，让商贾流 / 匠营流 / 游历流可对 WS03 首批内容池产生更明确的推荐差异
  - 当前批次已通过 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run type-check`，WS03 已从“有结构与调度”推进到“有首批可玩内容池可供页面与联动系统消费”的状态
  - 周刷新与换季刷新现会写入结构化经济日志，帮助后续 UI、调试面板和运营观测解释本周精选 / 季节货架变化

#### WS03 商店目录与豪华消费池扩容（T026）
- `src/views/game/ShopView.vue`、`src/views/game/WalletView.vue` 已补齐 WS03 页面入口与信息展示：
  - `ShopView.vue` 的万物铺现新增“目录运营总览”卡片，集中展示目录总量、已解锁数、已拥有数、每周精选规模、高价长期商品规模、活跃服务数与当前货架刷新提示
  - 万物铺货架页现会根据当前所选 pool 输出“当前货架摘要”与分池说明，帮助玩家快速理解基础消费池 / 每周精选 / 季节限定 / 高价长期商品分别适合什么阶段与消费目的
  - `WalletView.vue` 新增“商店豪华消费路线”卡片，把当前玩家分层、目录核心指标、本周精选提醒与当前路线更契合的推荐货架集中收口到钱袋页，形成“经济观测 -> 钱包流派 -> 商店消费”单页解释链
  - 钱包页现可直接查看当前每周精选的重点商品与推荐理由，同时展示 3 条与当前流派最契合的目录商品，减少玩家必须进入商店后才理解该买什么的断层
  - 当前批次已通过 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run type-check`，WS03 已从“有首批内容池”推进到“玩家能在商店页与钱包页直接理解后期消费路线”的展示状态

#### WS03 商店目录与豪华消费池扩容（T027）
- `src/stores/useShopStore.ts`、`src/data/shopCatalog.ts`、`src/data/decorations.ts`、`src/stores/useDecorationStore.ts` 已补齐 WS03 跨系统联动闭环：
  - 商店目录商品现新增 `decorationUnlockId`，展示型家具可直接映射到装饰系统中的真实陈设实例，而不再只是“已拥有一个抽象收藏品”
  - `src/data/decorations.ts` 已补入一批目录专属陈设定义，如 `catalog_bamboo_screen`、`catalog_festival_lantern`、`catalog_blossom_arch`、`catalog_courtyard_stage` 等，用于把 WS03 的展示消费真正接到家园美观度系统
  - `useDecorationStore` 新增 `grantDecoration()`，允许商店目录、活动奖励等系统安全授予装饰，不走二次扣钱路径，形成“购买目录商品 -> 获得陈设 -> 放入家园 -> 提升美观度 / 好感 / 商店折扣”的闭环
  - `useShopStore.purchaseCatalogOffer()` 现会在购买成功后统一调用 `buildCatalogClosureLogs()`：
    - 所有目录消费都会正式记入 `playerStore.recordSinkSpend(..., 'luxuryCatalog')`
    - 仓储扩建与额外箱子会追加“备货 / 订单 / 出货箱”方向的经营引导
    - 温室许可会追加“全年种植 / 高规格订单 / 豪华经营周”方向的经营引导
    - 展示型消费会自动授予并尝试摆放到装饰系统，直接把购买结果转成家园美观度、村民好感加成与商店折扣成长反馈
    - 补给包 / 功能券包 / 节庆礼盒会根据 `travelSupplyConfig`、`functionalVoucherConfig`、`festivalGiftConfig` 输出面向农耕 / 钓鱼 / 矿洞 / 节庆的后续经营引导
    - 若商品标签与当前主题周或推荐资金去向匹配，会追加“主题周 / 经济 sink”闭环日志提示
  - 购买成功后的闭环提示现统一使用结构化日志写入 `economy_sink_guidance` 与 `late_game_cycle` 标签，便于后续在 UI、调试面板与运营复盘中观察“商店消费是否真的带动家园 / 仓储 / 温室 / 主题周”的联动证据
  - 当前批次已通过 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run type-check`，WS03 已从“可展示、可购买”推进到“购买后能反过来改变家园展示、商店折扣与后续经营方向”的跨系统闭环状态

#### WS03 商店目录与豪华消费池扩容（T028）
- `src/types/shopCatalog.ts`、`src/data/shopCatalog.ts`、`src/stores/useShopStore.ts` 已补齐 WS03 事务安全与防刷处理：
  - `catalogExpansionState` 新增 `operationalMeta`，统一记录目录 tick 的日处理、周刷新与换季刷新游标，旧档读入时会自动补默认值
  - `useShopStore.processCatalogCycleTick()` 现按 `dayTag / weekId / season dayTag` 做幂等保护，同一日重复触发不会重复过期服务、重复刷新周精选或重复输出季节货架日志
  - `purchaseCatalogOffer()` 新增目录事务锁 `catalogPurchaseLock`，可阻止重复点击和并发购买；目录商品在结算中会明确提示“正在结算，请勿重复点击”
  - 目录购买快照已扩展到 `player / inventory / warehouse / home / farm / decoration / catalog state` 全链路，任一发放步骤失败都会完整回滚并自动退款，避免温室、装饰或容量扩张出现半成功状态
  - 周期型服务目录商品现在会根据 entitlement 生效期阻止重复购买，并在提示中展示到期日，降低服务叠加与误扣费风险
  - 当前批次已通过 `npm --prefix d:\taoyuan-latest\taoyuan-duli\taoyuan-main run type-check`，WS03 的目录购买、日结刷新与服务续期链路已具备完整的事务边界与防刷护栏

#### WS03 商店目录与豪华消费池扩容（T029）
- `src/data/shopCatalog.ts`、`src/stores/useShopStore.ts` 已补齐 WS03 调参与运营开关：
  - 新增 `SHOP_CATALOG_TUNING_CONFIG`，集中管理池子开关、隐藏商品、禁用品类、禁用价格带、每周精选数量、季节货架显示上限、推荐加权与 fallback 补位集合
  - `useShopStore` 现统一通过 `isCatalogOfferEnabled()` / `isCatalogOfferVisibleForCurrentSeason()` 过滤目录商品，支持快速关闭 weekly / seasonal / premium 池，或按 priceBand / luxuryCategory 精细收口异常内容
  - 周精选和高价长期商品现在支持 fallback 补位策略，即使临时隐藏部分货架，也能保证最小可玩目录集合不断档
  - 推荐列表已接入运营权重：可额外放大 weekly spotlight、premium、高价服务契约、展示型家具与强制推荐商品，做到“不改主逻辑也能热调推荐倾向”
  - 对玩家侧提示也已同步收口：若商品因运营配置停用，会在限制提示中明确展示“当前运营配置下暂未开放”

#### WS03 商店目录与豪华消费池扩容（T030）
- `src/data/shopCatalog.ts` 已补齐 WS03 QA、数值验收与上线文档：
  - 新增 `WS03_ACCEPTANCE_SUMMARY`，收口最少 QA 用例数、事务护栏与对外发布要点
  - 新增 `WS03_QA_CASES` 8 条，覆盖目录退款回滚、双击防刷、服务锁定、旧档兼容、tick 幂等、池子开关、fallback 补位与季节货架上限等场景
  - 新增 `WS03_RELEASE_CHECKLIST`，明确退款链路、服务锁、刷新幂等、运营配置与 UI 文案的一线验收项
  - 新增 `WS03_COMPENSATION_PLANS` 与 `WS03_RELEASE_ANNOUNCEMENT`，为漏退款、重复服务扣费与误关货架等异常提供补偿与公告预案
  - 当前批次已使 WS03 从“可玩可调”推进到“可验收、可发布、可补偿”的交付状态

#### WS04 市场行情与动态通胀抑制（T031）
- `src/data/market.ts` 已完成市场行情与动态通胀抑制基线审计口径收口：
  - 统一 4 个核心指标：单一卖货占比、热点参与率、价格波动接受度、多系统收入平衡度
  - 补齐 2 个护栏指标：过剩惩罚容忍度、市场转消耗承接率
  - 明确 3 档样本玩家分层、1 条失败回滚规则，以及与 farm / fishing / processing / quest / goal / wallet / market 的 linked system refs
  - 为后续 WS04 的数据结构、商店推荐、主题周路由与调参收口提供统一 KPI 基线

#### WS04 市场行情与动态通胀抑制（T032）
- `src/data/market.ts`、`src/stores/useShopStore.ts`、`src/stores/useSaveStore.ts` 已补齐 WS04 数据结构与旧档兼容底座：
  - 新增独立 `marketDynamics` 状态块，以及热点品类、冷却期、地区收购、超量惩罚、主题鼓励、替代奖励等统一状态/配置结构
  - 新增覆盖 P0 / P1 / P2 三阶段的 `MARKET_DYNAMICS_CONFIG`，收口市场阶段能力开关与默认参数
  - `useShopStore` 已接入 `marketDynamics` 的默认值、序列化 / 反序列化与阶段查询入口
  - `useSaveStore` 已为 shop 数据块补齐 `marketDynamics` 的旧档默认值迁移，确保 WS04 后续逻辑可在统一数据形状上继续扩展

#### WS04 市场行情与动态通胀抑制（T033）
- `src/stores/useShopStore.ts` 已补齐 WS04 Store 状态与 API 扩展：
  - 新增 `marketDynamicsBaselineAudit`、`marketDynamicsRoutingDefs`、`currentMarketDynamicsPhase`、`currentMarketPriceInfos`、`marketDynamicsOverview` 与 `recommendedMarketDynamicsRoutes`，统一输出阶段、热点、路线与推荐总览
  - 补齐 `getMarketHotspotSummary()`、`getRegionalProcurementSummary()`、`getOverflowPenaltySummary()`、`setMarketDynamicsPhase()`、`resetMarketDynamicsState()` 与 `getMarketDynamicsDebugSnapshot()` 等统一查询、切换与调试入口
  - 页面与后续工作流可直接消费市场动态状态，不再重复拼装热点摘要、地区收购解释与阶段调试快照
  - 为后续 WS04 的日结调度、页面信息展示与跨系统承接提供统一 store API 底座

#### WS04 市场行情与动态通胀抑制（T034）
- `src/stores/useShopStore.ts`、`src/composables/useEndDay.ts` 已补齐 WS04 日结 / 周结调度接入：
  - `useShopStore` 新增 `processMarketDynamicsTick()`，统一处理市场阶段自动切换、热点轮换、品类冷却、地区收购、过剩压制、主题鼓励与替代奖励的跨天/跨周刷新
  - 市场动态现按统一 `dayTag / weekId` 节奏做幂等处理，同一日重复触发不会重复刷新热点、重复生成地区收购或重复写入替代奖励
  - 周切换时会自动根据当前通胀压力切换 P0 / P1 / P2 阶段，并生成本周热点、地区收购与主题承接状态，过剩压制则按近 7 天出货量在日结阶段持续更新
  - `useEndDay` 已正式接入市场动态 tick，跨天、跨周、跨季切换现与村庄建设 / 博物馆 / 公会 / 瀚海 / 商店目录共用统一编排口径，并通过结构化市场日志记录轮换结果

#### WS04 市场行情与动态通胀抑制（T035）
- `src/data/market.ts` 已补齐 WS04 首批内容配置：
  - 新增 `MARKET_HOTSPOT_CONTENT_DEFS`，首批覆盖 crop / fish / processed / fruit / ore / gem / animal_product 七类热点内容定义，补齐推荐标签、建议目录商品与运营说明
  - 新增 `MARKET_REGIONAL_DISTRICT_DEFS` 与 `MARKET_DISTRICT_LABELS`，落地江南埠头、山路驿站、京市行会、瀚海互市 4 个地区收购内容池，统一地区标签、目标品类、物流价带与承接建议
  - 新增 `MARKET_THEME_ACTIVITY_CONTENT_DEFS`、`MARKET_SUBSTITUTE_REWARD_CONTENT_DEFS` 与 `MARKET_OVERFLOW_RESPONSE_DEFS`，把主题鼓励、替代奖励与过剩压制应对拆成可扩展数据表，覆盖 P0 / P1 / P2 三档内容带
  - 扩充 `ECONOMY_SINK_CONTENT_DEFS` 首批市场 sink 内容，从基础轮换经营证延伸到加工远期订货牌、过剩转运缓冲仓与跨域行情博览执照，为后续只改 data 扩容提供稳定入口

#### WS04 市场行情与动态通胀抑制（T036）
- `src/views/game/ShopView.vue`、`src/components/game/TopGoalsPanel.vue` 已补齐 WS04 页面入口与信息展示：
  - 商圈总览新增“市场轮换看板”，集中展示当前阶段、热点品类、地区收购、过剩压制、主题承接与推荐路线，玩家进入商店前即可理解本周该换什么货、该避开什么坑
  - 市场看板现补充上涨机会、下跌风险、地区收购详情与主题鼓励倍率，帮助玩家把 `processMarketDynamicsTick()` 产生的状态直接转化为可执行经营提示
  - `TopGoalsPanel` 新增“市场轮换摘要”卡片，把阶段、热点、路线建议与过剩压制提醒纳入目标规划区域，形成“主题周目标 + 市场轮换 + 本周重点目标”的统一视图
  - 使 WS04 从“有状态机、有内容池”推进到“玩家能在主页面直接理解热点轮换与通胀治理提示”的展示状态

#### WS04 市场行情与动态通胀抑制（T037）
- `src/stores/useQuestStore.ts`、`src/data/quests.ts` 已补齐 WS04 跨系统联动闭环：
  - 日常委托与紧急委托生成现会读取 `useShopStore` 的热点品类、地区收购、替代奖励、过剩压制与主题鼓励状态，对任务类型和目标品类做动态偏置，不再完全随机出牌
  - 特殊订单生成现会把市场热点品类、抑制品类与主题周偏好一并纳入权重，形成“市场热点 -> 订单池重排 -> 奖励回流票券 / 经营路线”的闭环
  - 村民委托的偏好类别也会根据当前市场主推方向在采集 / 烹饪 / 钓鱼之间切换，使农耕、钓鱼、加工与订单线在周节奏上真正互相牵引
  - 新增结构化市场联动日志，能从日志中直接看到“今日告示板更偏向哪些品类”“本周特殊订单为何偏向某条路线”的闭环证据

#### WS04 市场行情与动态通胀抑制（T038）
- `src/stores/useShopStore.ts`、`src/data/market.ts`、`src/composables/useEndDay.ts` 已补齐 WS04 事务安全与防刷处理：
  - `marketDynamics` 新增 `operationalMeta.lastShippingSettlementDayKey`，把出货箱结算也纳入 WS04 状态机自身的幂等保护，避免同一日重复结算导致重复记账 / 重复影响市场样本
  - `useShopStore` 新增 `settleShippingBoxWithMarketGuard()`，为出货箱结算补齐事务锁、玩家资产快照、市场历史快照、市场状态快照与失败回滚，结算异常时会自动恢复铜钱、出货箱、出货历史与市场动态状态
  - `useEndDay` 已改为调用新的事务化结算入口，并统一按成功 / 跳过 / 失败输出结构化市场日志，保证收入发放、市场样本更新与日志提示口径一致
  - 结合原有 `processMarketDynamicsTick()` 的按 `dayTag / weekId` 幂等处理，WS04 现已形成“市场 tick 防重 + 出货结算防重 + 失败自动回滚”的完整护栏

#### WS05 育种 × 特殊订单 × 主题周经营化（T041）
- `src/data/goals.ts`、`src/data/quests.ts`、`src/stores/useBreedingStore.ts`、`src/stores/useQuestStore.ts`、`src/types/goal.ts` 已补齐首批基线审计配置：
  - 新增 `BREEDING_SPECIAL_ORDER_THEME_AUDIT` 与 `BREEDING_SPECIAL_ORDER_BASELINE`，覆盖育种、特殊订单、主题周与鱼塘并行样本的统一口径
  - 首批定义 4 个核心指标、2 个护栏指标、3 档玩家分层、1 条回滚规则
  - 补齐 linked system notes，明确 breeding / quest / goal / fishPond / shop / villageProject 的采集口径与联动原因
  - `useBreedingStore` 新增 `getBreedingOrderAuditConfig()`，`useQuestStore` 新增 `getSpecialOrderBaseline()`，为后续 WS05 的玩法扩容与 UI 接入提供统一入口

### 本次收尾更新

#### 瀚海 / 育种 / 村庄建设收尾与联动补强
- 重整 `useHanhaiStore`：
  - 修复遗迹逻辑插入后出现的重复/错位函数问题
  - 补齐遗迹勘探记录、驻点奖励领取、藏宝图寻宝与每周重置逻辑
  - 存档现可正确保存 / 读取瀚海遗迹进度
- 补上瀚海遗迹入口与可玩闭环：
  - `HanhaiView.vue` 新增“遗迹勘探”页签，正式接入遗迹勘探、驻点奖励与预计收获展示
  - 页面现会显示每个遗迹的周剩余次数、探索费用、奖励预览与当前可执行提示
  - 修复遗迹成功日志重复、失败静默与背包空间提示缺失的问题，勘探 / 领奖状态提示更一致
  - 补齐瀚海商店与赌坊若干失败提示：背包不足购买、赌博入场失败等情况现在会直接写入日志，不再静默失败
- 修复育种页模板结构：
  - 修正 `BreedingView.vue` 中“经营型育种提醒”插入后导致的模板层级错乱
  - 恢复图鉴页“育种规则”折叠面板结构
  - 补回 `tutorialHint` 计算逻辑，避免脚本区残缺导致页面异常
- 修正育种经营提醒筛选逻辑：
  - `BreedingView.vue` 的“经营型育种提醒”现在只会显示 `themeTag === 'breeding'` 的特殊订单
  - 避免普通特殊订单误显示成育种提醒
- 补完任务页辅助逻辑：
  - `QuestView.vue` 新增 `getQuestRewardPreview`，修复委托列表奖励预览调用缺失
  - 特殊订单相关的 `demandHint` / `recommendedHybridIds` / `preferredSeasons` 字段完成自检与展示收口
- 修正订单展示语义：
  - `QuestView.vue` 中 `recommendedHybridIds` 现改为优先按作物/杂交品种名展示，不再回退为英文内部 ID
  - 未接取特殊订单卡片现补充剩余天数显示
- 新增“村庄建设”系统第一版落地：
  - 新增 `useVillageProjectStore`、`villageProjects` 数据与对应类型定义
  - 首批接入工台角、矿料棚与支架、节庆暖房、商队驿站、村塾学舍、温泉整修等建设项目
  - 村庄建设现接入 NPC 页展示，可直接查看线索、材料、费用与建设状态
  - 商队驿站会提高委托铜钱报酬，村塾学舍会提高委托好感收益，温泉整修会提高晚睡 / 昏倒后的体力恢复
- 村庄建设进一步补齐“专项进度 / 贡献结算层”：
  - 建设项目现可配置前置专项进度需求，如公会讨伐、博物馆捐赠、育种图鉴、瀚海遗迹、社区目标与累计委托完成数
  - `NpcView.vue` 现直接展示每个建设项目的专项进度条目与当前达成值
  - `useVillageProjectStore.completeProject()` 改为事务化扣料：若材料扣除途中失败，会回滚背包 / 仓库快照并返还铜钱，避免半扣料状态
  - 材料不足提示改为本地化物品名，不再显示原始英文 `itemId`
  - 继续按 `0410plan.md` 推进，新增“商队驿站扩建”项目：完成后每日告示栏额外增加 1 个可接取委托，形成“建设 → 更多订单 → 更多建设资源”的最小经营闭环
  - 进一步新增“村塾学舍扩建”项目：完成后最大同时接取任务数 +1，用于承接驿站扩建带来的更多告示栏供给
  - 扩建类项目现支持前置建设校验，避免“先扩建后建本体”的顺序错乱
- 目标与存档系统同步补强：
  - `GoalMetricKey` / 目标文案补充村庄建设等后续扩展指标占位
  - 存档、新游戏重置、读档迁移已纳入 `villageProject` 数据块，避免旧档或开新档时状态丢失
- 目标统计补实：
  - `useGoalStore` 现将 `hanhaiContractCompletions` 接到瀚海遗迹总勘探次数
  - `museumExhibitLevel` 现接到博物馆累计捐赠数，便于后续目标与主题周继续扩展
- 任务数据修复：
  - 修复 `data/quests.ts` 中特殊订单数组缺失闭合导致的构建报错
- 本轮收尾已完成构建验证：`vue-tsc -b && vite build`
  - 构建通过
  - 当前仅保留既有的大 chunk 体积 warning，无新增 TypeScript / Vite 构建错误

### 修复优化

#### 游戏玩法与界面修复（测试总监复核批次）
- 修复仙灵发现链在“初次相遇”阶段后提示消失的问题：
  - 仙灵页现在会继续展示 `encounter`（初次相遇）阶段，不会在触发相遇剧情后直接从列表中消失
  - 原“传闻”区调整为“线索与踪迹”，统一承载传闻 / 惊鸿一瞥 / 初次相遇三个阶段
  - 为初次相遇阶段补充兜底提示文案，避免玩家误以为狐狸 / 月兔相关仙缘线索丢失
- 修复温室收获未复用主农耕结算链的问题：
  - 温室收获现统一走完整作物结算逻辑
  - 补齐品质加成、双倍产量、甜度额外铜钱、农耕经验、委托进度与杂交品种成长记录
  - 修复温室长期收益低于普通田地的问题
- 修复读档后页面与内部地点状态错位的问题：
  - 读取存档后不再一律跳回 `/game/farm`
  - 现在会按存档中的地点分组跳转到对应页面（农场 / 村庄 / 野外 / 矿洞 / 瀚海）
  - 避免出现“画面在农场，但旅行耗时/体力仍按旧地点计算”的状态错乱
- 修复委托 / 主线提交前先校验奖励背包导致的假阻塞：
  - 现在改为先扣除交付物，再校验奖励能否放入
  - 若提交后腾出的空间仍不足，会安全回滚背包快照
  - 修复“明明可以提交却提示背包满”的错误体验
- 修复主线 `deliverItem` 只认主背包、不认临时背包的问题：
  - 主线交付目标现在会统计主背包 + 临时背包总量
  - 提交时也允许从任意背包位置扣除物品
- 优化顶部“休息”按钮布局：
  - 游戏主界面顶部休息按钮改为整行铺满
  - 修复桌面端按钮过短、与主体布局割裂的问题
- 增加未登录游客模式提示：
  - 主菜单未登录状态下新增明确提示
  - 直接开始新旅程时也会浮动提示“游客模式下存档无法保存，建议先注册账号后再长期游玩”
- 本轮修复已完成构建验证：`vue-tsc -b && vite build`
  - 构建通过
  - 当前仅保留既有的大 chunk 体积警告，无新增 TypeScript / Vite 构建错误

### 新增功能

#### 钱包流派化（MVP）与目标 / 商店联动
- 钱包页新增“钱包流派”选择：在原有钱袋被动之外，现在可额外选择 1 条经营路线。
- 当前开放 3 条基础流派：
  - 商贾流：偏向现金流、每周精选与高价经营
  - 匠营流：偏向农耕、采矿、烹饪与建设采购
  - 游历流：偏向钓鱼、探索见闻与外出补给
- 三条流派会在达成对应里程碑后开放选择，并可继续解锁各自节点，进一步强化经营偏好。
- 选择流派后，每日目标会更容易刷新出与你当前路线相符的方向，并在界面上标注“流派推荐”来源。
- 万物铺新增“为你推荐”货架：会根据当前钱包流派，优先展示更适合你的精选商品、功能商品或长期经营向商品。
- 万物铺推荐区现补充展示货架内容摘要，玩家可直接从列表看到扩容、材料包、温室许可、仓储或补给类商品的实际效果预览。
- 万物铺新增“周更惊喜”卡位：会从当前每周精选中挑出一项本周特别推荐商品，复用现有购买弹窗与每周刷新机制，便于快速关注本周重点货架。
- 目标面板与任务页新增本周主题展示，当前会按季节显示对应主题周，帮助玩家更容易理解本周经营方向。
- 目标系统现新增“本周重点目标”只读派生展示：会从现有今日目标与本季目标中筛出最贴合主题周方向的条目，并同步展示在 `TopGoalsPanel` 与 `QuestView` 中，帮助玩家更直观看到当前经营重点。
- 钱包流派重置现增加二次确认弹窗，重置前会明确提示将清空当前流派与已解锁节点，避免误触导致进度丢失。
- 钱包页现进一步拆分展示“流派说明 / 主效果 / 已激活节点效果”：会分别展示当前流派主效果摘要、已解锁节点带来的附加偏好或折扣，并为每个节点补充“商店 / 目标 / 农耕 / 钓鱼 / 采矿 / 烹饪”等生效模块标签，便于玩家快速理解当前路线收益构成。
- 目标数据层现补充 `GoalBiasRule`、`GapCorrectionRule`、主题周奖励预览与 UI 元信息，并在 `data/goals.ts` 中补齐目标指标名称、偏置规则、缺口修正规则和主题周文案元数据，为后续继续扩展缺口修正与连续奖励提供更稳定的数据基础。
- NPC 类型定义现补充 `relationshipReward`、`npcPerk`、`familyEvent` 等结构声明，后续关系奖励、家庭事件和类型收敛可以直接复用统一类型。
- 万物铺货架数据现新增推荐字段、推荐理由模板、周更惊喜权重和 UI 角标；商店页会为推荐区、周更惊喜与本期货架补充“容量 / 扩建 / 灌溉 / 鱼塘 / 矿洞 / 周更惊喜”等角标，推荐文案也可根据配置模板生成，便于后续继续扩展推荐包而不改购买主链路。
- 存档加载流程现补充 `wallet / goal / shop` 缺块默认值与迁移收口：旧档即使缺少这几块数据，也会在 `useSaveStore` 中先补安全默认结构，再统一交给对应 store 反序列化，减少旧档读入后目标池为空、钱包流派状态缺失或商店推荐状态异常的风险。
- 日切逻辑现收口为 `goalStore.onCalendarAdvanced(seasonChanged)` 单入口：统一处理每日目标刷新、换季季节目标刷新与主题周刷新，修正换季时可能重复触发主题周刷新提示的问题，并使“主题周刷新 / 周更惊喜周切换”与日期推进链路更一致。
- 本轮钱包流派与目标 / 商店联动已完成构建验证：`vue-tsc -b && vite build`

#### 图鉴百科体验增强
- 图鉴页新增总览检索能力：
  - 增加名称 / 描述搜索框
  - 增加分类筛选
  - 增加发现状态筛选（全部 / 已发现 / 未发现）
  - 增加默认 / 最近发现 / 售价排序
- 图鉴页新增分区快捷入口，可直接跳转至：
  - 育种图鉴
  - 鱼塘图鉴
  - 怪物图鉴
- 图鉴页新增更直观的进度反馈：
  - 显示当前总发现进度
  - 显示当前筛选结果数量
  - 显示当前筛选下的已发现数量
  - 增加“当前筛选下没有匹配条目”空状态提示
- 物品图鉴详情弹窗信息密度增强：
  - 新增“获取方式”展示
  - 新增“使用方式”展示
  - 新增分类专属“详细信息”区块
  - 新增“可由以下方式产出”加工反查
  - 新增“可用于以下加工 / 制作”用途反查
- 当前已接入的细节展示覆盖：
  - 作物 / 种子：季节、生长时间、多茬、深灌、巨型作物等
  - 鱼类：地点、季节、天气、难度
  - 果树 / 树苗：来源果树、成熟时间、产果季节、对应果实
  - 机器 / 洒水器 / 肥料 / 鱼饵 / 浮漂 / 炸弹：制作成本、数值效果或使用属性
  - 武器 / 戒指 / 帽子 / 鞋子：装备属性与效果
- 未发现条目现在也可点击查看：
  - 新增“未发现条目引导”面板
  - 按物品分类给出来源方向、解锁条件与玩法线索
  - 提供相关系统快捷跳转按钮（如商圈 / 农场 / 钓鱼 / 鱼塘 / 矿洞 / 公会等）
- 图鉴新增阶段里程碑展示：
  - 在图鉴页展示当前发现进度与下一里程碑差值
  - 明示不同发现数里程碑对应的经营收益与系统联动效果
- 图鉴进度已接入商圈货架解锁：
  - 部分每周精选 / 高价长期商品增加图鉴发现数门槛
  - 当前已接入：竹编行囊、百草收纳盒、匠心灌溉箱、垂钓大师礼盒、温室特许状
  - 商店列表与商品弹窗会显示“图鉴未解锁”提示及所需发现数
- 为降低后续维护成本，新增 `src/data/collectionRegistry.ts`：
  - 统一收敛图鉴分类名称、颜色映射
  - 统一管理物品使用说明、未发现条目提示、图鉴里程碑配置
  - 为后续扩展各玩法图鉴的共用注册接口打下基础
- 图鉴详情弹窗改为可滚动布局，便于承载高信息密度条目
- 本轮图鉴百科增强已完成构建验证：`vue-tsc -b && vite build`

#### 育种系统优化（P0 / P1 / P2 第一轮实现）

本轮围绕育种系统进行了首轮分阶段落地，重点覆盖了“说明一致性、可操作性、种子管理、图鉴目标化、持久谱系基础、高代减负基础、经营联动首批接入”几个方向。

##### P0：说明一致性与失败反馈增强
- 统一育种系统解锁语义：`useBreedingStore` 中的说明明确为“**首次获得育种种子时解锁**”
- 调整育种相关教程文案：晨间提示现在明确写明**种子制造机加工时会概率额外产出育种种子**
- 调整育种页面顶部教程提示：
  - 未解锁时提示玩家通过种子制造机获取第一颗育种种子
  - 种子箱为空时提示继续通过种子制造机加工获取育种种子
- 调整育种页“育种规则”文案：移除“普通收获直接掉育种种子”的误导表达，统一为**种子制造机额外掉落**
- 增强杂交失败反馈：
  - 选种弹窗现在显示当前平均甜度 / 目标甜度 / 差值
  - 显示当前平均产量 / 目标产量 / 差值
  - 给出推荐建议文案，如“优先继续同种培育提升甜度/产量”

##### P1：种子箱管理与图鉴目标化
- `useBreedingStore` 新增种子箱排序能力：
  - 默认
  - 总属性
  - 甜度
  - 产量
  - 抗性
  - 世代
- `useBreedingStore` 新增种子箱筛选能力：
  - 全部
  - 杂交种
  - 普通种
  - 高星种
  - 收藏种子
- 新增收藏系统：
  - 玩家可以收藏 / 取消收藏育种种子
  - 收藏状态写入育种存档，读档后保留
  - 被移除的种子会自动清理收藏状态，避免悬空 ID
- 育种页种子箱增加：
  - 排序按钮组
  - 筛选按钮组
  - 收藏心形角标显示
  - “当前筛选下无种子”空状态
- 育种页种子详情弹窗增加“收藏 / 取消收藏”操作按钮
- 图鉴新增目标化能力：
  - 计算每个杂交品种是否缺少亲本
  - 判断当前是否可杂交成功
  - 判断是否“接近可成”（门槛差值较小）
- 图鉴新增状态筛选：
  - 全部目标
  - 已发现
  - 可合成
  - 接近可成
- 图鉴新增“当前推荐目标”面板：
  - 优先展示最接近完成的 3 个未发现杂交品种
  - 显示亲本组合与推荐说明

##### P2：持久谱系基础与高代减负基础
- `SeedGenetics` 新增 `lineageParents` 字段，用于持久保存近几代祖代快照
- `types/breeding.ts` 新增 `SeedLineageNode` 类型，用于序列化谱系节点
- 同种培育与异种杂交产出的后代现在会写入谱系快照，而不再完全依赖当前种子箱中的祖先实体
- 杂交失败返回的退化种子也会尽量保留原有谱系快照
- 育种页详情弹窗中的“亲本溯源”现在优先读取**持久谱系快照**，即使祖代种子已经不在种子箱内，也能保留近几代溯源能力
- 高代减负基础已接入：
  - 当两颗亲本的最低世代达到 10 代及以上时
  - 本次育种耗时从 2 天缩短为 1 天
  - 同步增加日志提示“高代品系已经更加稳定，本次育种耗时缩短了1天”

##### P2 补齐：育种研究升级
- 新增 3 级育种研究升级：`稳育笔记`、`速育图谱`、`谱系档案`
- 研究升级使用铜钱 + 材料推进，不改动旧存档主结构，仅追加 `researchLevel`
- 研究效果包含：
  - “接近可成”识别范围扩大
  - 高代速育门槛从 10 代下调到 8 代
  - 杂交失败时的属性损耗降低
  - 持久谱系快照深度扩展到 3 层

##### P3：育种大师化（第一轮落地）
- 育种页新增“育种大师化”被动效果面板
- 当前已接入 4 条大师化被动的可视化解锁判断：
  - 目标分析
  - 精密育种
  - 谱系档案
  - 订单育种师
- 这些被动以研究等级 / 图鉴发现数为条件，不破坏旧存档读取

##### P4：经营联动强化（第一轮落地）
- 特殊订单生成逻辑增加“已发现杂交品种”前置判断：
  - 翡翠茶、月光稻、金蜜瓜、凤凰椒订单不再无条件进入池子
  - 只有玩家已在育种图鉴中发现对应品种后，相关订单才会开放
- 任务系统增加 `themeTag: 'breeding'` 主题标签
- `QuestView` 已为相关订单增加“育种订单”标记，强化玩家对育种 → 经营兑现链条的认知

##### 经营联动（首批接入）
- 特殊订单模板新增多条杂交作物订单，首批接入：
  - 翡翠茶（`jade_tea`）
  - 月光稻（`moonlight_rice`）
  - 金蜜瓜（`golden_melon`）
  - 凤凰椒（`phoenix_pepper`）
- 这些订单进入每日 / 节点特殊订单生成池后，可作为育种作物的经营兑现出口，增强育种与委托 / 经济系统联动

##### 构建与验证
- 已对本轮育种优化改动执行生产构建验证：`vue-tsc -b && vite build`
- 构建通过
- 当前仍存在项目原有提示：
  - `taoyuan-entry.css` 在构建时不存在，将在运行时解析
  - 若干 chunk 体积超过 500 kB 的警告
  - 以上均非本轮育种改动新增错误

#### 作物种类扩充
- 新增 11 种基础作物：
  - 夏季：荔枝（多茬×3，180文）、龙眼（多茬×4，140文）、茭白（需深灌，90文）、苦瓜（多茬×4，65文）
  - 秋季：板栗（160文）
  - 冬季：荠菜（多茬×4，50文）、雪里蕻（多茬×3，60文）、冬笋（120文）
  - 经济作物：棉花（夏秋，95文，布匹原材料）、桑叶（春夏，多茬×6，40文，养蚕原料）
  - 注：桂花与柿子原已存在，未重复添加
- 新作物种子在对应季节自动于万物铺出售（seedPrice > 0）
- 图鉴百科「作物」分类自动收录所有新作物

#### 育种系统修复：种子制造机全作物覆盖
- 修复大量作物（所有杂交品种及部分基础作物）无法放入种子制造机育种的问题
- 根因：`processing.ts` 手写配方仅覆盖最初 34 种作物，其余 413 种无配方，无法触发育种种子生成
- 修复方案：在 `PROCESSING_RECIPES` 末尾自动生成所有缺失配方，运行时检测已有配方后补全剩余作物
- 全链路验证通过：种子制造机 → 育种箱 → 育种台 → 种植 → 收获，所有447种作物均可正常流转

#### 鱼饲料获取渠道扩展
- 新增磨坊加工配方：干草×5 → 鱼饲料×3，1天
- 新增回收站配方：垃圾×4 → 鱼饲料×2，1天（让钓鱼垃圾有实际用途）
- 旅行商人商品池新增鱼饲料（约60文）和水质改良剂（约120文），周五/周日随机出售
- 物品来源注释同步更新

#### 委托黑板扩展
- 每日告示栏委托数量从 1-2 个增加至 2-3 个
- 新增矿石采集委托：目标含铜矿/铁矿/金矿/石英/石材，NPC 为阿石、孙铁匠、云飞
- 新增加工品委托：目标含铜锭/铁锭/蜂蜜/米酒/食用油，NPC 为孙铁匠、春兰、雪琴、林老
- 新增紧急委托机制：每天 25% 概率额外生成一个紧急委托
  - 限时 1 天，金钱奖励翻倍，好感奖励额外 +5
  - UI 红色边框 + 「紧急·仅剩1天」标签
  - 进行中任务同样显示紧急标记

#### 熔炉合金扩展
- 新增三种合金物品（可登记图鉴）：
  - 青铜锭（120文）：铜锭×2 + 铁锭×1，2天
  - 精制石英（50文）：石英×2 + 木炭×1，1天
  - 秘银锭（350文）：水晶矿×3 + 铁锭×1，3天
- 加工系统支持副材料（extraInputs）：合金配方需同时消耗主材料与副材料
  - 加工坊 UI 显示副材料持有量/需求量，不足时禁用按钮
  - 取消加工或拆除机器时副材料一并退回

#### 农场装饰系统
- 新增农场装饰功能（导航菜单新增「装饰」入口，归属农场分组）
- 20 种装饰物，分为围栏、灯饰、植物、石材、水景、杂项六类
- 美观度系统：放置装饰物累积分数，达到阈值触发加成：
  - ≥ 50：全体 NPC 每日好感 +1
  - ≥ 100：全体 NPC 好感上限 +250
  - ≥ 200：所有商店额外折扣 5%（与现有折扣叠加）
- 部分高级装饰需美观度达标后解锁购买
- 商店折扣明细新增「农场装饰」折扣行

#### 温室地块育种种子支持
- `useFarmStore.ts` 新增 `greenhousePlantGeneticSeed` action，参考 `plantGeneticSeed` 实现，支持对温室地块使用育种种子
- `FarmView.vue` 新增 `doGhPlantGeneticSeed` handler 处理温室育种种子操作
- 温室地块弹窗新增「育种种子」区，展示育种箱内所有种子（不过滤季节，温室无季节限制）

#### 一键种植弹窗育种种子展示修复
- 修复一键种植弹窗中育种种子可能被推出屏幕外、无法显示全部条目的问题
- 根因：普通种子列表与育种种子列表各自设有 `max-h-40` 限制，两段内容叠加后总高度可能超出视口，育种种子区被推至屏幕外
- 修复方案：将两段列表合并至单一滚动容器（`max-h-[60vh] overflow-y-auto`），普通种子与育种种子统一在同一区域内滚动显示

#### 目标描述补全
- 主线第3阶段「回应村庄需要」：补充说明「图鉴→祠堂页签可提交物品完成」
- 长期目标「村庄栋梁」（完成3个社区目标）：同上
- 长期目标「社区中坚」（完成6个社区目标）：同上
- 长期目标「蟹笼渔家」：补充说明「钓鱼页签可购买或制作蟹笼，放置后计入数量」
- 长期目标「家业有人」/「儿女双全」：补充说明「结婚7天后且配偶好感≥3000，配偶会随机提议要孩子」

#### 传闻回顾功能
- 仙灵页「传闻」区的条目现在可以点击，弹出当初触发该传闻时的完整剧情对话，方便玩家回顾
- 回顾模式下选择选项不会重复触发缘分变化，不影响游戏数据

### 存档兼容性

| 变更项 | 兼容性 | 说明 |
|--------|--------|------|
| 装饰系统存档块 | 完全兼容 | 旧存档缺少 decoration 块时跳过，默认空状态 |
| 紧急委托 isUrgent 字段 | 完全兼容 | 旧存档委托加载时缺失字段默认 undefined（视为非紧急）|
| 合金配方副材料 | 完全兼容 | extraInputs 为配方数据层字段，不存储于运行时槽位 |
| 新合金锭物品 | 完全兼容 | 旧存档背包/图鉴不含新 ID，正常显示为未发现 |
| 新委托模板 | 完全兼容 | 告示栏每日重新生成，旧存档无残留委托数据 |
| 背包容量上限 | 完全兼容 | 旧存档已有容量保留，MAX_CAPACITY 提升后可继续扩容 |
| 新增基础作物（11种） | 完全兼容 | 仅追加至 CROPS 数组，不修改存档字段；旧存档地块不含新 ID，getCropById 有守护判断，不崩溃 |
| 种子制造机配方自动生成 | 完全兼容 | 运行时动态 push 至 PROCESSING_RECIPES，不涉及存档序列化；SAVE_VERSION 维持 2 不变 |
| 传闻回顾（UI） | 完全兼容 | 纯 UI 运行时状态，不新增存档字段，依赖已有 completedSteps 字段读取 |
| 温室育种种子 | 完全兼容 | 仅新增 action 与 UI handler，温室地块数据结构不变，旧存档正常读取 |
| 目标描述文本更新 | 完全兼容 | 纯展示文本修改，不涉及存档字段或目标判定逻辑 |
| 睡眠恢复时机修复 | 完全兼容 | 仅调整日结算内部顺序，不新增存档字段 |
| 鱼塘待收取产物结算 | 完全兼容 | 继续复用已有 `pendingProducts` / `collectedToday` 字段，旧存档可直接读取 |
| 鱼塘 returnedFishPool 字段 | 完全兼容 | 新增字段仅用于暂存取出鱼的个体信息，旧存档缺失时在 `deserialize` 中默认回落为 `{}` |
| 存档模式活跃槽位绑定 | 完全兼容 | `activeSlotMode` 为运行时状态，不写入存档 payload；旧存档加载与导入格式均不受影响 |
| 隐藏 NPC 即时发现检查 | 完全兼容 | 仅新增运行时触发时机；仍复用原有 `hiddenNpcStates.completedSteps / discoveryPhase` 字段，不改存档结构 |
| 怪物诱饵每层限次 | 完全兼容 | 使用次数为运行时楼层态，不写入存档；读档后仍按原有矿洞外状态恢复 |
| 温室操作规则统一 | 完全兼容 | 仅补充温室播种/收获的体力、时间、工具与熬夜校验，不修改温室地块结构 |
| 奖励发放原子化扩展 | 完全兼容 | 仅新增背包整组写入校验与调用点调整，不修改任何存档字段 |
| 洒水器占格限制 | 完全兼容 | 不修改农田地块结构，仅增加放置与种植时的规则校验 |
| 育种收藏状态 `favoriteSeedIds` | 完全兼容 | 旧存档缺失该字段时默认空数组，不影响种子箱读取 |
| 育种持久谱系 `lineageParents` | 完全兼容 | 旧种子缺失谱系字段时回退到原始 parentA/parentB 逻辑展示，不破坏旧存档 |
| 育种排序/筛选/推荐状态 | 完全兼容 | 均为运行时状态或安全默认值，不影响旧存档载入 |
| 高代育种耗时缩短 | 完全兼容 | 仅修改育种启动时的耗时计算逻辑，不新增必须迁移的存档字段 |
| 杂交作物特殊订单 | 完全兼容 | 仅追加特殊订单模板，不影响旧委托数据结构 |
| 育种研究等级 `researchLevel` | 完全兼容 | 旧存档缺失时默认 0 级；新版本只是在育种块中追加安全字段 |
| 育种订单主题标签 `themeTag` | 完全兼容 | 属于任务实例的可选字段，旧任务缺失时按普通委托显示 |
| 特殊订单发现前置 `requiredHybridId` | 完全兼容 | 仅影响新订单生成池筛选逻辑，不修改旧进行中委托结构 |
| 孕期照料每日次数统一 | 完全兼容 | 复用现有 `caredToday` 等字段，旧存档缺失时按默认值处理 |
| 感染层 / BOSS 楼层奖励幂等 | 需要兼容处理 | 新增楼层奖励领取记录；旧存档读取时会基于历史进度/已击败 BOSS 自动补推默认值，避免重复领取 |
| 矿洞战利品回滚记录扩展 | 完全兼容 | 运行时增强本次探索奖励记录结构，不影响旧存档主数据读取 |
| 下一层成功后扣时 | 完全兼容 | 仅调整前端交互与时间推进顺序，不涉及存档字段 |
| 收获事务化 / 战斗耗时 / 营业判定修复 | 完全兼容 | 均为运行时逻辑顺序调整，不新增或修改存档结构；旧存档可直接继续游玩 |

#### 背包容量上限提升
- 背包最大容量从 60 格提升至 120 格
- 扩容方式不变：在商圈购买，每次 +4 格，价格随等级递增（500、1000、1500…文）

### 修复与调整

#### QuestView 任务信息展示补全与图鉴页拆分推进
- 修复任务页主线任务的初始化显示缺口：进入任务页时会主动补齐主线初始化，避免新流程下主线区块不显示当前任务。
- 任务页主线总数改为跟随 `STORY_QUESTS.length` 动态显示，不再写死 50，降低后续主线扩展时的维护风险。
- 优化任务页交互反馈：接取 / 提交主线、委托、特殊订单失败时不再直接关闭弹窗，便于玩家就地查看失败原因。
- 补全进行中任务详情中的好感奖励展示，使“可接任务 / 进行中任务 / 特殊订单”三处奖励信息表达保持一致。
- 作为 TODO「拆分 AchievementView」的第一步，图鉴页签已改为复用 `src/components/game/ItemCollectionTab.vue`，先行剥离 `AchievementView.vue` 中最重的一块职责，为后续继续拆分成就 / 祠堂 / 出货 / 笔记模块打基础。
- `NpcView` 现补充展示关键村民的“职业侧重”标签，帮助玩家更直观理解不同关系线偏向商路、矿冶、渔业、药养或节庆协作等收益方向。
- `QuestView` 现为村民委托补充“当前关系 / 接取门槛 / 当前关系收益 / 下一阶段可解锁”说明，并将文案收敛为关系收益视角，避免误解为该委托会即时发放全部 NPC 关系加成。
- 补齐阿石的矿冶型关系奖励配置：朋友阶段可获得一次性铁矿支持，挚友阶段会进一步开放更紧要的矿料筹备与支架差事说明，使关键 NPC 奖励线更完整。

#### 第三次复审定向修复（8 项）
- 统一普通农田育种播种规则：
  - 普通农田单格育种播种现补齐凌晨 2 点限制、锄头可用性检查、体力扣除失败回退与 `passedOut` 处理
  - 普通农田批量育种播种现与常规播种保持一致，统一校验工具占用、熬夜限制、时间推进与晕厥结算
- 修复山丘田庄地表矿脉的部分入包问题：
  - 采集前先校验整组容量
  - 改为 `canAddItem + addItemExact` 的事务式写入
  - 若精确入包失败会回退体力，不再出现“矿脉消失但只拿到部分矿石”的情况
- 修复加工取消 / 拆机返还的吞料风险：
  - 加工启动前新增副材料充足性检查，避免主材料先扣后失败
  - 取消加工与拆除机器前会先汇总全部返还条目并做容量校验
  - 已完成产物、加工中原料、副材料与机器返还材料现统一走精确返还路径
- 配偶 / 雇工代收现复用统一收获事务：
  - 新增农田统一收获封装，整合作物品质、双倍产量、巨型作物、经验、甜度额外金钱与杂交登记逻辑
  - 雇工收获与配偶晨间代收改为调用同一事务，避免与玩家手动收获出现规则分叉
- 修复仓库拆箱吞物：
  - 拆卸箱子前会先对“箱内全部物品 + 拆机返还材料”做整组容量校验
  - 仅在整组可完整写入背包时才真正清空箱子并拆除
- 修复主矿洞 BOSS 装备可重复刷取的问题：
  - 戒指 / 帽子 / 鞋子奖励改为按楼层独立记录领取状态
  - 兼容旧存档读取，避免曾经挑战过的楼层在新版本中重复发放固定装备奖励
- 修复矿洞战利品记账与回滚不一致的问题：
  - 战利品记录改为基于“写入前后总数差值”记账，只记录真实入包数量
  - 回滚路径可同时从主背包与临时背包扣回，降低探索失败后奖励残留或回滚不完整的情况
- 加强存档加载保护：
  - 读档时改为先备份当前会话快照，再进入反序列化流程
  - 若中途出现坏档 / 脏档 / 结构异常，将回滚到加载前状态，不再因为半途失败清空当前游玩进度

#### 跨天与结算顺序修复
- 修复 `handleEndDay()` 中睡眠时间读取时机错误的问题，晚睡/熬夜恢复惩罚现在按实际入睡时间结算，不再错误读取到次日清晨时间
- 修复鱼塘跨天结算与手动收取重复发奖的问题；鱼塘产物现在在跨天后保留为待收取状态，需要前往鱼塘领取，不再自动入包后再次领取
- 修复温室一键收获在体力不足时可能“先清地后停下”导致吞作物的问题；现改为按可用体力限制本次实际收获数量，未收获的成熟作物会保留

#### 奖励幂等与触发条件修复
- 为矿洞感染层清剿奖励增加楼层级幂等标记，避免重复清层后反复领取同层奖励
- 为主矿洞 BOSS 楼层的固定铜钱/矿石奖励增加楼层级幂等标记，避免重复挑战弱化版 BOSS 时重复刷取楼层奖励
- 修复隐藏 NPC 配置中的错误路由名，将错误的 `foraging` / `npc` 条件改为实际路由 `forage` / `village`，恢复相关显灵与发现链的可触发性

#### 体力、占格与每日限制修复
- 修复跨区域移动未严格校验体力扣除结果的问题；体力不足时将阻止移动，不再白嫖移动耗时与位移
- 修复洒水器与作物重叠占格的问题；农田地块放置洒水器后不可再种植，已种植地块也不能放置洒水器，批量种植同样会跳过带洒水器的地块
- 修复孕期照料每日次数限制不统一的问题；赠礼、陪伴、补品、休息现统一受每日照料次数约束

#### 矿洞失败回滚与时间扣除修复
- 补充矿洞战利品回滚记录结构，失败时会对本次探索中获得的部分普通物品、铜钱以及装备类掉落执行回退处理，降低装备与特殊战利品不受惩罚的问题
- 调整矿洞“下一层”时间扣除顺序，改为仅在成功进入下一层后才推进时间，避免失败操作白白消耗时间

#### 收获事务与鱼塘逻辑修复
- 修复普通农田、巨型作物、温室收获、采脂器收取、鱼塘产物领取等流程中“先清状态后入包”导致的吞货问题；现统一改为先校验背包容量，再执行状态变更并使用精确入包
- 修复鱼塘跨天产物覆盖问题；次日产出会追加到 `pendingProducts`，不会覆盖玩家尚未领取的旧产物
- 修复鱼塘收获在背包空间不足时一次性全吞的问题；现支持按背包容量部分领取，剩余产物会保留待下次收取
- 修复鱼塘“取出→再放回”会重置个体品种、可反复刷 Gen1 品种与图鉴的问题；现通过 `returnedFishPool` 复用原鱼个体信息

#### 存档隔离与新开局重置修复
- 修复切换本地 / 云端存档模式后自动存档可能写入错误介质的问题；当前活跃槽位现与存储模式绑定，切换模式会清空旧会话槽位引用
- 兼容旧存档：`activeSlotMode` 仅为运行时字段，不进入存档序列化，旧档可直接读取，无需提升 `SAVE_VERSION`
- 修复新开局未重置装饰数据的问题；现在 `resetAllStoresForNewGame()` 会同步重置 `useDecorationStore`，避免跨档装饰残留污染

#### 营业、关系事件与矿洞规则修复
- 修复商店可达性按“出发时刻”而非“到达时刻”判定的问题；现改为根据旅行后的到达时间检查是否营业
- 修复已婚后仍可能触发普通婚前心事件的问题；已婚状态下将只保留应有的婚后 / 知己事件路径
- 修复主矿洞与骷髅矿穴中 BOSS 层兼任安全点时可绕过 BOSS 的问题；BOSS 层不再写入安全点进度
- 修复矿洞中重新接敌不耗时、战斗回合不耗时的问题；再次交战与每个战斗回合现在都会正常推进时间，昏厥时会进入日结算

#### 温室、发现链与奖励事务修复
- 统一温室播种 / 育种播种 / 单格收获 / 一键收获 / 一键种植的规则校验；现已补齐体力消耗、工具可用性、时间推进与凌晨 2 点强制休息判定
- 修复隐藏 NPC 发现条件只在日结时检查的问题；现在会在时间推进与地点切换后即时复核发现条件，减少“明明到过地点却要睡觉才触发”的反直觉情况
- 修复怪物诱饵可在同层重复叠加刷怪的问题；现在每层仅允许使用一次怪物诱饵
- 扩展奖励原子化覆盖面：主线 / 委托 / 成就 / 公会讨伐 / 博物馆里程碑 / 秘密笔记 / 多种加工制造与成品收取，现都会先校验背包容量，再统一发放或安全拒绝
- 修复仓库取出与虚空箱 / 加工链路中的部分入包风险；现在箱子入出库与加工产物回收都会优先确保整组物品可完整写入
- 继续补齐高风险非原子链路：NPC 关系阶段赠礼、送礼回礼、瀚海藏宝图、雇工/配偶代收、孵化器退蛋、鱼塘取鱼、出货箱取回等流程现已增加前置容量校验或精确入包
- 修复旧档/脏档兼容细节：鱼塘存档中的非法鱼类、非法待收产物与失效出货箱物品会在反序列化时被安全过滤，避免读取后再触发吞物或状态错乱
- 修复矿洞战败后的楼层态残留问题；昏厥离场时也会清空怪物诱饵本层使用标记，避免异常继承到后续探索
#### WS11 UI 引导、推荐系统与信息层级补强（T103）
- 完成 Store 状态与 API 扩展：
  - `src/stores/useGoalStore.ts` 已新增 `uiGuidanceSourceOverview` 与 `getUiGuidanceDebugSnapshot()`，统一收口主题周、活动、资金去向、风险摘要与目标摘要的源快照。
  - `src/stores/useTutorialStore.ts` 已新增 `guidanceTier`、`guidanceNeedsRefresh`、`guidancePanelSummaryStates`、`guidanceRecommendationRouteStates`、`guidanceSurfaceSnapshots`、`markGuidanceSurfaceViewed()`、`markGuidanceRouteAdopted()`、`ensureGuidanceDigestFresh()`、`getGuidanceDebugSnapshot()` 等聚合 API，后续页面可直接消费按 surface 收口后的 summary / route snapshot。
  - `src/types/tutorial.ts`、`src/data/tutorials.ts`、`src/stores/useSaveStore.ts` 已同步扩展 guidance digest 的 `activeRouteIds`、`adoptedRouteIds`、`lastViewedSurfaceId`、`surfaceStates` 字段，并补齐旧档回填。
  - 当前已满足“页面只消费 store 暴露结果；关键逻辑可单独调用；存档序列化完整”的验收目标，并通过 `npm run type-check`。
#### WS11 UI 引导、推荐系统与信息层级补强（T104）
- 完成日结 / 周结调度接入：
  - `src/composables/useEndDay.ts` 已在活动窗口、商店目录 / 市场轮换、博物馆、公会、瀚海、关系循环与周度风险报告更新完成后统一调用 `tutorialStore.ensureGuidanceDigestFresh()`，保证 guidance digest 每天随日结对齐最新的 theme week / campaign / summary / route 状态。
  - guidance digest 刷新只在跨周、跨季、主题周切换、活动切换或 active snapshot 变化时写入结构化日志，避免把经营引导做成刷屏公告。
  - `src/types/log.ts` 已新增 `ui_guidance_digest_refresh` tag，后续调试、QA 与页面提示可直接复用同一刷新口径。
  - 当前已满足“刷新 cadence 稳定、跨周边界可解释、摘要不会因 dayTag / theme / campaign 漂移失效”的验收目标，并通过 `npm run type-check`。
#### WS11 UI 引导、推荐系统与信息层级补强（T105）
- 完成内容配置首批落地：
  - `src/types/tutorial.ts` 已新增 `GuidanceSummaryContentVariantDef`、`GuidanceRouteContentVariantDef` 等内容表类型，便于后续继续扩展 guidance 卡片与路线模板。
  - `src/data/tutorials.ts` 已补齐 `WS11_GUIDANCE_SUMMARY_CONTENT_DEFS` 与 `WS11_GUIDANCE_ROUTE_CONTENT_DEFS`，首批覆盖资金去向、目录推荐、特殊订单、活动摘要、馆区焦点、邮件摘要与目标规划等内容模板。
  - `src/stores/useTutorialStore.ts` 已把 route / summary 的 headline 与 detail 生成改为消费这些数据表，形成“store 保留条件判断，data 承载首批文案与内容引用”的结构。
  - 当前已满足“首批内容可读、可扩展、可按 surface / route 复用”的验收目标，并通过 `npm run type-check`。
#### WS11 UI 引导、推荐系统与信息层级补强（T106）
- 完成页面入口与信息展示：
  - 已新增 `src/components/game/GuidanceDigestPanel.vue` 作为统一 guidance 页面入口组件，内部直接消费 `useTutorialStore.ts` 暴露的 surface snapshot，并提供已读打点、摘要采纳、路线采纳与提示收起入口。
  - `src/views/game/WalletView.vue`、`src/views/game/QuestView.vue`、`src/views/game/BreedingView.vue`、`src/views/game/MuseumView.vue`、`src/views/game/ShopView.vue` 现已分别接入 `wallet / quest / breeding / museum / shop` 对应 surface 的 guidance digest 面板。
  - 页面层已改为“轻模板 + 重用 store snapshot”的模式，玩家可在页面顶部直接看到本页当前推荐要点、承接路线与状态反馈。
  - 当前已满足“玩家能在页面内直接理解这条后期路线做到了哪、下一步该看什么”的验收目标，并通过 `npm run type-check`。
#### WS11 UI 引导、推荐系统与信息层级补强（T107）
- 完成跨系统联动闭环：
  - `src/types/tutorial.ts` 已新增 `GuidanceLoopLinkDef`、`GuidanceCrossSystemOverview`、`GuidanceCrossSystemAction` 等闭环类型。
  - `src/data/tutorials.ts` 已新增 `WS11_GUIDANCE_LOOP_LINK_DEFS`，把 `wallet -> shop`、`quest -> quest`、`breeding -> breeding`、`museum -> museum` 的首批周决策链路配置化。
  - `src/stores/useTutorialStore.ts` 已新增 `guidanceCrossSystemOverview`，统一输出 active surface、linked systems、source summary 与 weekly decision loop，并打通摘要采纳与相关路线采纳。
  - `src/composables/useEndDay.ts` 会在每周切换时输出跨系统 weekly loop 引导日志，当前已把资金去向、任务路线、成长承接与展陈焦点串成可追踪的周决策链，并通过 `npm run type-check`。
#### WS11 UI 引导、推荐系统与信息层级补强（T108）
- 完成事务安全与防刷处理：
  - `src/stores/useTutorialStore.ts` 已新增 `guidanceActionLocks`、`beginGuidanceAction()`、`finishGuidanceAction()`、`createGuidanceDigestSnapshot()`、`rollbackGuidanceAction()` 与 `getGuidanceOperationDebugSnapshot()`。
  - `markGuidanceSurfaceViewed()`、`markGuidanceSummaryDismissed()`、`markGuidanceSummaryAdopted()`、`markGuidanceRouteAdopted()`、`refreshGuidanceDigest()` 已全部接入运行时锁与回滚快照。
  - 旧档 `deserialize()` 时也会主动清空残留 guidance lock，当前已满足“重复点击不重入、异常更新可回滚、读档后无残留锁”的验收目标，并通过 `npm run type-check`。

#### WS11 UI 引导、推荐系统与信息层级补强（T109）
- 完成调参与运营开关：
  - `src/data/tutorials.ts` 已新增 `WS11_GUIDANCE_TUNING_CONFIG`，统一管理 surface panel、cross-system loop、summary / route 自动联动、weekly loop 日志、运行时锁、surface view tracking 与显示数量参数。
  - `src/stores/useTutorialStore.ts` 已正式消费 `guidanceTuning`、`guidanceFeatureFlags`、`guidanceDisplayConfig`、`guidanceOperationConfig`，将 route / detail / loop 的显示数量与自动联动逻辑改为配置驱动。
  - `src/composables/useEndDay.ts` 也已按 `weeklyLoopLogEnabled` 控制 weekly loop 日志输出，当前已满足“至少 6 个核心参数可通过 data 配置热调”的验收目标，并通过 `npm run type-check`。

#### WS11 UI 引导、推荐系统与信息层级补强（T110）
- 完成 QA、数值验收与上线文档：
  - `src/data/tutorials.ts` 已新增 `WS11_ACCEPTANCE_SUMMARY`、`WS11_QA_CASES`、`WS11_RELEASE_CHECKLIST`、`WS11_COMPENSATION_PLANS`、`WS11_RELEASE_ANNOUNCEMENT`。
  - 首批 QA 用例已覆盖五个 guidance 页面入口、weekly loop 刷新、旧档兼容、重复点击幂等与配置降级场景。
  - 补偿与运营兜底方案已覆盖 guidance 状态错位、重复采纳膨胀与面板噪音过高等风险，WS11 当前已整体收口并再次通过 `npm run type-check`。
#### WS12 QA、平衡、灰度、存档兼容与回滚（T111）
- 完成基线审计与 KPI 定义：
  - `src/data/goals.ts` 已新增 `WS12_QA_GOVERNANCE_BASELINE_AUDIT`，统一收口坏档率、回滚触发率、任务结算错误率、发布后热修次数 4 个核心指标。
  - 已补齐 2 个护栏指标：旧档迁移兜底占比、灰度开关漂移率，并新增 3 档样本玩家分层、1 条全局稳定性软回滚条件与跨 `useSaveStore` / `usePlayerStore` / `useInventoryStore` / `useMiningStore` / `useProcessingStore` / `useQuestStore` / `useVillageProjectStore` 的联动口径。
  - `src/stores/usePlayerStore.ts`、`src/stores/useSaveStore.ts` 已新增 `qaGovernanceBaselineAudit` 与 overview/debug 入口，便于后续治理任务继续沿用同一口径。
  - 当前已满足“形成可执行指标清单；至少定义4个核心指标、2个护栏指标、1个失败回滚条件”的验收目标，并通过 `npm run type-check`。

#### WS12 QA、平衡、灰度、存档兼容与回滚（T112）
- 完成数据结构与类型定义：
  - `src/types/economy.ts` 已补齐 `QaGovernanceFeatureFlags`、`QaGovernanceMigrationProfileDef`、`QaGovernanceTransactionGuardDef`、`QaGovernanceRegressionSuiteDef`、`QaGovernanceCompensationMailPreset`、`QaGovernanceRuntimeState` 等治理层类型。
  - `src/data/goals.ts` 已新增 feature flag、迁移 profile、事务守护、回归套件、补偿邮件与 runtime state 默认结构。
  - `src/data/quests.ts`、`src/data/villageProjects.ts` 已补齐首批治理预设常量，`src/stores/usePlayerStore.ts` 也已接入 `qaGovernanceRuntimeState` 与旧档回填。
  - 当前已满足“旧档读入不报错；新字段都有默认值；结构保留未来扩展位”的验收目标，并通过 `npm run type-check`。

#### WS12 QA、平衡、灰度、存档兼容与回滚（T113）
- 完成 Store 状态与 API 扩展：
  - `src/stores/usePlayerStore.ts` 已新增迁移 profile、灰度通道、回滚/热修计数、回归套件、补偿邮件状态的统一 getter / action / debug snapshot。
  - `src/stores/useSaveStore.ts` 已新增治理总览、存档模式治理入口与治理调试快照，页面或调度层可直接复用。
  - 当前已满足“统一读写入口、关键逻辑可单独调用、序列化完整”的验收目标，并通过 `npm run type-check`。

#### WS12 QA、平衡、灰度、存档兼容与回滚（T114）
- 完成日结 / 周结调度接入：
  - `src/composables/useEndDay.ts` 已在日结后标记 `ws12_regression_daily_settlement` 回归套件，并在每周切换时补记 `ws12_regression_weekly_cycles`。
  - 每周切换时还会输出 QA 治理巡检日志，统一记录存档模式、灰度通道、回滚累计与热修累计。
  - 当前已满足“日结、周结切换状态一致；治理日志可见且不散落在页面”的验收目标，并通过 `npm run type-check`。
#### WS12 QA、平衡、灰度、存档兼容与回滚（T115）
- 完成内容配置首批落地：
  - `src/data/goals.ts` 已新增 `WS12_QA_GOVERNANCE_CONTENT_TIERS`，首批覆盖中期过渡、后期进阶、终局展示 3 档治理包，并分别给出 `priceBand`、`outputBand`、`consumptionBand`。
  - `src/data/quests.ts` 已新增 `WS12_QUEST_SETTLEMENT_GOVERNANCE_CONTENT_DEFS`，把日结交付探针、特殊订单结算护栏、上线结算闸门等结算治理内容表配置化。
  - `src/data/villageProjects.ts` 已新增 `WS12_VILLAGE_PROJECT_GOVERNANCE_CONTENT_DEFS`，补齐维护巡检、捐献对账与建设结算稳定闸门等治理内容表。
  - `src/stores/usePlayerStore.ts`、`src/stores/useSaveStore.ts` 也已把这些内容 tiers 接入 overview / debug snapshot，后续页面可直接复用，并通过 `npm run type-check`。
#### WS12 QA、平衡、灰度、存档兼容与回滚（T116）
- 完成页面入口与信息展示：
  - 已新增 `src/components/game/QaGovernancePanel.vue` 作为统一 QA 治理页面入口组件，内部直接消费 `usePlayerStore.ts` 与 `useSaveStore.ts` 的治理 overview / runtime state / content tiers。
  - `src/views/game/WalletView.vue`、`src/views/game/QuestView.vue`、`src/views/game/BreedingView.vue`、`src/views/game/MuseumView.vue`、`src/views/game/ShopView.vue`、`src/views/game/GuildView.vue`、`src/views/game/HanhaiView.vue`、`src/views/game/NpcView.vue` 已接入治理面板。
  - 页面现可直接展示需求摘要、花费拆解、收益预览、推荐理由、周巡检节奏与风险说明，并提供灰度通道切换与发布闸门记录等低风险一键操作。
  - 当前已满足“后期页面能在页内说明治理状态与下一步 QA 节奏”的验收目标，并通过 `npm run type-check`。
#### WS12 QA、平衡、灰度、存档兼容与回滚（T117）
- 完成跨系统联动闭环：
  - `src/data/goals.ts` 已新增 `WS12_QA_GOVERNANCE_LOOP_LINK_DEFS`，首批把收入转消耗、成长转订单、展示转声望、活动转奖励 4 条治理链路配置化。
  - `src/stores/useSaveStore.ts` 已新增 `qaGovernanceCrossSystemOverview`，统一聚合 `usePlayerStore`、`useQuestStore`、`useProcessingStore`、`useVillageProjectStore`、`useMuseumStore`、`useGoalStore` 的治理闭环摘要。
  - `src/components/game/QaGovernancePanel.vue` 已接入跨系统闭环摘要展示，当前已把治理状态从单页说明提升为可追踪的周决策链，并通过 `npm run type-check`。

#### WS12 QA、平衡、灰度、存档兼容与回滚（T118）
- 完成事务安全与防刷处理：
  - `src/stores/usePlayerStore.ts` 已新增 `qaGovernanceActionLocks`、运行时快照与回滚入口，并将迁移 profile、灰度通道、回滚/热修计数、回归套件与补偿邮件相关 action 全部接入防重入保护。
  - `src/stores/useSaveStore.ts` 已新增 `qaGovernanceStorageActionLocks` 与存档治理快照，`setQaGovernanceStorageMode()` 现已具备异常回滚保护。
  - 当前已满足“重复点击不重入、异常更新可回滚、存档治理切换后无残留锁”的验收目标，并通过 `npm run type-check`。

#### WS12 QA、平衡、灰度、存档兼容与回滚（T119）
- 完成调参与运营开关：
  - `src/data/goals.ts` 已新增 `WS12_QA_GOVERNANCE_TUNING_CONFIG`，统一管理自动回归、发布闸门快捷操作、存档模式快捷切换与跨系统闭环展示数量等参数。
  - `src/stores/usePlayerStore.ts`、`src/stores/useSaveStore.ts`、`src/composables/useEndDay.ts` 与 `src/components/game/QaGovernancePanel.vue` 已正式消费这套 tuning config。
  - 当前已满足“至少 7 个核心参数可通过 data 配置热调”的验收目标，并通过 `npm run type-check`。

#### WS12 QA、平衡、灰度、存档兼容与回滚（T120）
- 完成 QA、数值验收与上线文档：
  - `src/data/goals.ts` 已新增 `WS12_ACCEPTANCE_SUMMARY`、`WS12_QA_CASES`、`WS12_RELEASE_CHECKLIST`、`WS12_COMPENSATION_PLANS`、`WS12_RELEASE_ANNOUNCEMENT`。
  - 首批 QA 用例已覆盖治理面板展示、daily / weekly / release 回归套件、灰度切换、旧档回填、事务锁、防重入与补偿说明场景。
  - WS12 当前已整体收口完成，并再次通过 `npm run type-check`。
#### 审查整改（第一轮）
- 已修复 `familyWishCompletions` 死目标：
  - `src/stores/useGoalStore.ts` 现已改为读取 `useNpcStore().getFamilyWishOverview().state.completedWishIds.length`，不再固定返回 `0`。
- 已修复瀚海周快照口径错误：
  - `src/composables/useEndDay.ts` 现已在 `processCycleTick()` 前记录周切换前的瀚海完成数，并通过 `archiveWeeklyMetricSnapshot(..., overrides)` 写回 `hanhaiContractCompletions`，避免被新周重置清零。
- 已补活动邮件最小闭环：
  - `src/utils/mailboxApi.ts` 新增 `createSystemMailboxCampaign()`。
  - `server/src/routes/api.js` 与 `server/src/taoyuanMailbox.js` 新增当前玩家可用的系统活动邮件投递入口。
  - `src/composables/useEndDay.ts` 现会在活动周切换后尝试投递活动邮件。
  - `src/stores/useGoalStore.ts` 已统一活动邮件 receipt key 口径，避免模板状态错配。
  - `src/views/game/MailView.vue` 已在活动奖励领取后回写活动层与任务窗口层的领取状态。
- 已修复村庄捐献“只加进度不扣物资”漏洞，并补上最小入口：
  - `src/stores/useVillageProjectStore.ts` 现已先校验/扣除背包与仓库物资，再更新捐献状态，失败会回滚。
  - `src/views/game/HomeView.vue` 已补充快速捐赠与里程碑领取入口。
- 已补强旧档兼容：
  - `src/stores/useBreedingStore.ts` 已对种子 genetics 做 normalize。
  - `src/stores/useFishPondStore.ts` 已对 `pond.breeding` 做结构校验。
- 已修复静态质量门当前阻塞项：
  - `npm run type-check`、`npm run lint` 已重新通过。

#### 审查整改（第二轮）
- 已补陪伴线最小自动编排：
  - `src/stores/useNpcStore.ts` 已在每周切换时自动编排家庭心愿、自动注册知己协作项目、推进周进度并写入关系线日志，避免长期停留在“只展示状态壳子”。
- 已补学者委托重复接取保护：
  - `src/stores/useMuseumStore.ts` 已阻止对 `rewarded` 状态的学者委托再次接取，减少重复领奖风险。
- 已收回 QA 治理面板污染：
  - `src/components/game/QaGovernancePanel.vue` 现仅在 `DEV` 环境显示，不再默认污染正式玩家页面。
- 已补鱼塘页治理入口：
  - `src/views/game/FishPondView.vue` 现已接入 QA 治理面板，鱼塘不再完全掉出统一治理首屏体系。
- 已推进存档版本治理：
  - `src/stores/useSaveStore.ts` 的 `SAVE_VERSION` 已提升到 `3`，`src/data/sampleSaves.ts` 与 `WS12_SAVE_MIGRATION_PROFILES` 也已同步提升到 `3`，不再停留在名义化版本治理。
- 已继续保持静态检查通过：
  - `npm run type-check`
  - `npm run lint`

#### 审查整改（第三轮）
- 已补家庭心愿 / 知己协作奖励闭环：
  - `src/data/npcs.ts` 已为 `WS09_FAMILY_WISH_DEFS`、`WS09_ZHIJI_COMPANION_PROJECT_DEFS` 补齐真实奖励配置。
  - `src/stores/useNpcStore.ts` 已新增关系奖励发放逻辑，家庭心愿与知己协作会真正发钱 / 发物资，并在背包空间不足时保留待重试状态，不再直接空结算。
  - `src/stores/useNpcStore.ts` 同时补了 `activateNextFamilyWishForCurrentDay()` 与 `registerNextZhijiProjectForCurrentWeek()`，`src/views/game/HomeView.vue` 也已接入最小主动入口，玩家可以直接推进下一条家庭心愿和知己协作。
- 已补村庄捐献里程碑真实奖励：
  - `src/types/villageProject.ts` 与 `src/data/villageProjects.ts` 已为 6 个里程碑补齐真实奖励结构与奖励配置。
  - `src/stores/useVillageProjectStore.ts` 的 `claimDonationMilestone()` 现会先校验并发放奖励，再记录领取状态，不再停留在“只写状态”的伪完成功能。
- 已收口经济推荐真源分叉：
  - `src/views/game/WalletView.vue`、`src/views/game/ShopView.vue` 已统一改为消费 `src/stores/useGoalStore.ts` 的 `recommendedEconomySinks`，不再各自重算一套推荐结果。
- 已补项目内 QA 命令并扩展 guidance 覆盖：
  - `package.json` 新增 `qa:late-game-samples` 与 `qa:late-game`。
  - `scripts/qa-late-game-samples.mjs` 已落地，用 Node 直接审计 `late_economy_foundation`、`breeding_specialist`、`fishpond_operator`、`endgame_showcase` 四套内置后期样例档。
  - `src/types/tutorial.ts`、`src/data/tutorials.ts`、`src/stores/useTutorialStore.ts` 已扩展 `fishpond / guild / hanhai / npc` 四个 guidance surface。
  - `src/views/game/FishPondView.vue`、`src/views/game/GuildView.vue`、`src/views/game/HanhaiView.vue`、`src/views/game/NpcView.vue` 已接入 `GuidanceDigestPanel`，统一 guidance / governance 体系不再只覆盖原先 5 个页面。
- 当前校验结果：
  - `npm run qa:late-game-samples`
  - `npm run type-check`
  - `npm run lint`

#### 0416 审查整改进度补记
- 已确认家庭心愿时长与完成态防线收口：
  - `src/stores/useNpcStore.ts` 已用 `addDaysToRelationshipDayTag()` 按 `durationDays` 推导真实 `expiresDayTag`，周切换只在 `isRelationshipDayTagExpired()` 为真时过期；`completeFamilyWish()` 也会同时校验 `activeWishId`、`rewardClaimed`、`completedWishIds` 与完成进度，避免重复发奖 / 重复叠 streak。
- 已确认鱼塘三条高频整改落地：
  - `src/stores/useFishPondStore.ts` 已在 `pruneDisplayEntries()` 中让病鱼 / 未成熟 / 不达标样本自动退出展示槽；空塘日结也会衰减 `ornamentalFeedBuffDays` 与 `quarantineShieldDays`；鱼基因反序列化继续对 `mutationRate` 等字段做钳制，避免脏档把非法基因带回运行时。
- 已确认公会周快照口径改为周增量：
  - `src/stores/useGuildStore.ts` 现按 `lastSnapshot*` 基线写入 `contributionGained`、`goalClaims`、`bossClears`，并在跨周时冻结当周 `rankBand`，不再把累计值和新周档位写回上一周。
- 已确认瀚海商路 / 遗迹闭环可跑通：
  - `src/views/game/HanhaiView.vue` 已提供商路投资入口与遗迹提示；`src/stores/useHanhaiStore.ts` 已接入 `investInRoute()`、遗迹探索推进 `setCollections`，商路投资与套组收集不再停留在只读展示。
- 已补本轮构建阻塞的日志类型与遗迹完成摘要：
  - `src/types/log.ts` 已补 `hanhai_route_investment` 标签；`src/stores/useHanhaiStore.ts` 在遗迹探索完成套组时会把套组名写进日志摘要，避免本轮瀚海整改继续卡在 `npm run build`。
- 当前复核状态：
  - `npm run build` 已通过。
  - 瀚海赌场“进行中赌局存档”问题仍未在本轮覆盖，后续需要单独继续收口。

#### 0418 存档链路、角色修正与多页交互收口
- `src/stores/useSaveStore.ts` 新增账号作用域重载与服务端槽位安全分配保护，避免切账号后沿用错误存档模式，并在服务端槽位拉取失败时继续把真云档当空槽覆盖。
- `src/stores/usePlayerStore.ts` 新增派生数值归一化入口，读档时不再过早按旧运行态裁剪 HP；旧档缺少 `gender` 时会正确进入身份补录流程。
- `src/views/MainMenu.vue`、`src/views/AuthView.vue` 已在登录/退出后重载当前账号存档上下文，并改进退出失败时的反馈；旧档身份补录会立即尝试写回当前存档。
- `src/views/GameLayout.vue` 已修复设置弹窗关闭后遗留 `settings` 暂停原因、导致时钟卡死的问题。
- `src/composables/useHiddenNpcActions.ts` 已把隐世 NPC 供奉/特殊互动的时间推进从错误的 30/60 小时修正为 30/60 分钟。
- `src/views/HallView.vue` 已阻止图片上传未完成时发帖，切帖时会清空引用回复目标，并收紧点赞/点踩的并发互斥。

#### 0418 背包、烹饪、商店与工具升级修复
- `src/views/game/ToolUpgradeView.vue` 现在会在提交升级前重新校验铁匠铺营业时间，不再允许打烊后继续提交升级。
- `src/views/game/InventoryView.vue` 与 `src/stores/useInventoryStore.ts` 已修复临时背包在满包但仍可并堆时被错误锁死的问题，并为丢弃数量增加正整数校验；合成帽子/鞋子也会拦截重复制作。
- `src/stores/useCookingStore.ts` 已在批量烹饪前校验成品是否有足够背包空间，避免先扣材料再把成品吞掉。
- `src/views/game/ShopView.vue` 已让一键全卖排除种子，并修正 `boom` 行情颜色与合成帽子/鞋子的拥有态校验。

#### 0418 后续玩法修复补记
- `src/stores/useDecorationStore.ts`、`src/data/decorations.ts`、`src/data/shopCatalog.ts` 已修复目录装饰快照回滚与 `premium_golden_frame` 解锁链路，避免“付钱成功但家园里不能摆、异常回滚后仍保留美观度收益”。
- `src/stores/useMuseumStore.ts`、`src/views/game/MuseumView.vue` 已保留“已完成待领取”的学者委托跨周可领奖状态，并隐藏未捐赠藏品的来源提示，避免周切周吞奖励和提前剧透。
- `src/stores/useFishPondStore.ts` 已在旧档读档时从鱼塘现存样本与归还池回填 `discoveredBreeds`，避免图鉴被错误清空。
- `src/stores/useAchievementStore.ts` 已把成就现金奖励改为不重复计入 `totalMoneyEarned`，并让旧档图鉴补录覆盖 `tempItems` 且保留原有“未知首次发现时间”口径，不再把读档当天误写成首次发现日。
- `src/stores/useSkillStore.ts`、`src/stores/useBreedingStore.ts`、`src/stores/useQuestStore.ts` 已补强旧档兼容：战斗分支 `defender -> combat` 会正确迁移，缺失 `genetics.id` 的种子不再用易撞号兜底，`stationCount` 会与恢复出的育种台数量自动对齐，旧特殊订单缺少 `initialDaysRemaining` 时也会按实际剩余天数补全。
- `src/stores/useSaveStore.ts`、`src/views/game/GuildView.vue` 已修复公会赛季基线字段在迁移时被裁掉、导致读档后赛季荣誉口径漂移的问题，并补上讨伐奖励/公会商店的明确阻塞反馈；赛季未开启时不再渲染完整赛季面板，BOSS 装备掉落标签也与一次性必得逻辑对齐。
- `src/stores/useHanhaiStore.ts` 已让瀚海解锁/读档后立即同步阶段与首领轮换，并把德州/恶魔轮盘进行中会话纳入快照和反序列化，避免异常回滚把赌场局面直接清空。
- `src/views/game/SkillView.vue`、`src/components/game/PerkSelectDialog.vue`、`src/views/game/BreedingView.vue` 已修正文案与预览口径：`庄园主 / 兽王 / 哲学家 / 海洋霸主` 说明现在与真实效果一致，成功杂交时的后代预览也会按真实杂交公式展示目标品系和属性范围。
- `src/stores/useQuestStore.ts`、`src/data/quests.ts`、`src/views/game/QuestView.vue` 已让限时任务窗口按真实天数收束，并把活动窗口状态真正接入高阶订单生成；Quest 页顶部也会展示实际剩余天数，不再固定显示 `5/7/14 天`。
- `src/views/game/HanhaiView.vue`、`src/composables/useGameClock.ts` 已让瀚海长局小游戏在德州/恶魔轮盘期间正确暂停游戏时钟，避免跨日把整局作废。
- `src/stores/useAchievementStore.ts`、`src/stores/useFishingStore.ts`、`src/stores/useCookingStore.ts`、`src/stores/useWalletStore.ts` 已把 `anglers_token` / `chefs_hat` 改为按“实际钓到的鱼种 / 实际做过的不同菜谱”解锁，并在读档时即时补发符合条件的钱包被动。
- `src/stores/useAiAssistantStore.ts`、`src/utils/taoyuanAiApi.ts` 已补 AI 助手重入保护，并修正管理端 `temperature=0` 被错误回读成 `0.2` 的问题。
- `src/stores/useMailboxStore.ts` 已改为按当前真实运行会话判断是否需要在领奖后回读服务端槽位，减少面板模式切换带来的误判。
- `src/stores/useInventoryStore.ts`、`src/stores/useWarehouseStore.ts`、`src/stores/usePlayerStore.ts`、`src/stores/useHiddenNpcStore.ts` 已把序列化快照改为真实克隆，不再把 live 引用暴露给事务回滚。
- `src/stores/useInventoryStore.ts`、`src/views/game/MiningView.vue` 已让装备方案记住武器附魔版本，并在旧档反序列化时自动清理“双槽装备同一枚戒指 / 同类戒指”的异常状态。
- `src/components/game/FishingMiniGame.vue`、`src/views/game/FishingView.vue` 已让“放弃钓鱼”确认框真正暂停小游戏本体，确认期间鱼不会继续结算逃跑。
- `src/stores/useInventoryStore.ts` 已把 `removeItemAnywhere()` 调整为“跨主包/临时包按品质优先扣除”，避免不指定品质时先误吃临时背包里的高品质物资。
- `src/stores/useWalletStore.ts` 已加入进度监听，常驻钱袋被动会在条件达成后即时补发，不再必须等到睡觉结算后才生效。
- `src/stores/useGameStore.ts`、`src/stores/useSaveStore.ts` 已修复旅行体力没有吃到全局减耗、固定/节日天气可被强制覆写，以及旧档缺失 `tomorrowWeather` 时首日预报按错误季节推导的问题。
- `src/stores/usePlayerStore.ts`、`src/views/GameLayout.vue`、`src/composables/useEndDay.ts` 已修正晚睡/昏倒后的体力恢复百分比文案，并补强旧档 `maxStamina` 对 `staminaCapLevel/bonusMaxStamina` 的推断。
- `src/stores/useShopStore.ts` 已让出货箱结算按同日链式供需逐条重算行情，不再整箱按同一静态倍率结算；同时取回改为全有全无，不再静默部分成功。
- `src/views/game/WalletView.vue` 已为“切换钱包流派”补确认弹窗，避免误点直接清空当前流派节点。
- `src/views/game/ForageView.vue`、`src/views/game/FishingView.vue` 已去掉采集与淘金的“假成功”提示：背包放不下时不再继续显示“获得了 / 淘到了”，而是明确写成发现了但没能带走。
- `src/stores/useFishingStore.ts` 已把“无鱼可钓先吞鱼饵”和“零权重鱼池强行回退到第一条鱼”的链路拆开处理，当前地点根本无鱼或玩家钓具/等级尚未达标时，不会再白白消耗鱼饵并误钩出越门槛鱼种。
- `src/stores/useFishingStore.ts` 已为更换浮漂补上背包保护：满包且旧浮漂无法回收时会直接阻止更换，不再先吞旧浮漂再装备新浮漂。
- `src/stores/useFishingStore.ts`、`src/composables/useEndDay.ts` 已为蟹笼收获补上满包失败反馈；背包放不下时会记录“抓到了但没能带走”，并保留有饵蟹笼的饵料，避免继续静默吞收获和鱼饵。
- `src/stores/useAnimalStore.ts` 已在旧档反序列化时补齐 `mood / daysOwned / daysSinceProduct / wasFed / wasPetted / hunger / sick / sickDays / fedWith` 等动物日结字段，并同步归一化宠物状态，避免老档首个过夜把产出天数写成 `NaN` 后长期停产。
- `src/stores/useSettingsStore.ts` 已让读档时真正同步 BGM 运行态：载入 `bgmEnabled=false` 的存档会立即停掉当前音乐，不再出现设置显示已关闭但 BGM 继续播放到玩家手动切换的错态。
- `src/stores/useSecretNoteStore.ts` 已在读档时清洗秘密笔记状态：`collectedNotes / usedNotes` 现在会去重、过滤非法 ID，并强制保证 `used ⊆ collected`，避免脏档把笔记掉落与宝藏领奖链路永久卡死。
- `src/stores/useProcessingStore.ts` 已让自动续作链路重新套用织布机的 `gui_nv_1` 缩时逻辑；隐世能力在虚空原料箱自动续作时不再失效，玩家无需手动停机重开才能吃到加速。
- `src/stores/useFarmStore.ts`、`src/composables/useEndDay.ts` 已把“当天实际浇水/雨淋”的状态在日结前冻结成稳定快照，戒指加速与绿雨额外成长不再读取已被清空的 `plot.watered`，手动浇水和普通雨天作物也能正确吃到成长加成。
- `src/stores/useHomeStore.ts`、`src/views/game/CottageView.vue` 已把酒窖取物改成原子流程：先校验背包容量，再完整入包，最后才移除酒窖槽位；满包时会在确认弹窗里明确提示并禁用取出，避免陈酿成品被直接吞掉。
- `src/stores/useNpcStore.ts` 已在离婚/断知己后同步清理失效的家庭分工与知己协作状态，并在旧档反序列化后自动兜底校正，避免关系结束后无效协作项目继续推进或发奖励。
- `src/stores/useTutorialStore.ts` 已把 guidance digest 的 dismiss/adopt 状态改成按“主题周/活动周期 + 当前内容签名”作用域记忆；同一 `summaryId/routeId` 到了新一周、新活动或内容变化时会重新变成 fresh/available，不再被旧状态永久吞掉。
- `src/stores/useShopStore.ts` 已在旧档反序列化时对 `shippedItems` 做迁移后去重：`mill_fish_feed`、`recycle_fish_feed` 折叠为 `fish_feed` 后不会再重复计入出货图鉴、全出货判定与完美度。
- `src/stores/useMailboxStore.ts`、`src/stores/useSaveStore.ts` 已把邮箱领奖后的自动回读收紧到“当前真实运行中的服务端会话”上，并在存在本地 pending 副本时直接跳过危险回读；同时新增更明确的 `reason_detail/message`，避免旧 `pendingRaw` 把刚领取的服务端奖励重新覆盖掉。
- `src/stores/useSaveStore.ts` 已为同槽位待同步副本补上“仅当仍是同一版本才清理”的并发护栏：旧上传先返回时不会再把较新的 pending 副本误删，避免补传链路把新进度丢回旧版本。
- `src/views/game/WalletView.vue`、`src/stores/useSaveStore.ts` 已把额度兑换绑定到“当前真实运行中的服务端会话”上，并在当前槽位仍有待同步本地副本时直接拦截兑换；这样不会再把 queued/pending 状态误当成已确认的服务端活动槽，降低资源写错档风险。
- `src/stores/useCookingStore.ts`、`src/stores/useMiningStore.ts`、`src/data/recipes.ts` 已把料理 `activeBuff` 的“语义层”拆开处理：`体力上限+30（当天）` 现在会提供真实的临时体力上限而不再直接回满体力，`防御+3` 会按固定减伤而不是百分比误算；同时把原本实际按减耗生效的少数“农耕/采矿技能+1/+2”料理文案改成与真实效果一致，避免继续出现文案与结算错位。
- 当前复核状态：
  - `npm run type-check`
  - `npm run build`
