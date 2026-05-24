# 桃源乡独立版更新日志

最后整理：2026-05-24

- 新增联机房间 `visual_state` 视觉状态协议底座：节会与远征房间 snapshot 会返回 board 类型、board ID、版本、高光、选中态和最近反馈，旧房间缺字段会自动补空视觉状态。
- 前端节会 / 远征 API 类型已同步 `OnlineVisualState`，新增 `qa:activity-room-visual-state` 验证新房间返回视觉状态、旧房间兼容补默认状态。
- 扩展 `visual_state.nodes` 地图节点协议：节点已支持坐标、状态、连线、事件 ID、可行动作、队友处理中标记，以及风险、奖励和资源预览。
- 扩展 `visual_state.objects` 场景物件协议：物件已支持坐标、类型、状态、可行动作、进度、处理人、处理时间和协作人数，为灯会共建与好友庄园照料提供数据底座。
- 扩展 `visual_state.tracks` 轨道协议：轨道已支持格子类型、队伍 / 船只占位、环境事件、可行动作、风险 / 奖励预览和前进、后退、加速、受阻、保护效果，为龙舟赛道与商队护送提供数据底座。
- 扩展 `visual_state.async_projects` 异步共建协议：公共工程已支持阶段、阶段物件、贡献入口、里程碑、跨天 / 跨周进度、贡献榜、历史回看和完成后庆典触发信息，为村社修桥与节庆筹备提供数据底座。
- 新增远征可视化地图板 `VisualMapBoard`：矿洞房间现在可显示节点、连线、危险 / 奖励 / 撤离图标、节点详情和节点动作区；服务端暂未返回节点时会用 6 节点 mock 洞窟路线兜底，旧玩法动作按钮保留为降级入口。
- 协作矿洞节点图补齐前端收口：`VisualMapBoard` 现在会标出队伍当前位置、提供移动端节点列表降级，并在行动反馈更新时播放短动效；远征房间有节点动作时会把旧全局动作卡收为无地图 / 无节点动作时的降级入口。
- 协作矿洞节点图接入服务端真实状态：`expedition_cavern` 会生成洞口、岔路、矿脉、塌方、路标、撤离点 6 个节点，采矿 / 标记 / 支护行动会更新节点状态、处理人、反馈和视觉版本；旧房间缺节点时会自动补齐。
- 协作矿洞结算凭证新增 `route_replay` 路线回看：服务端会保存探索路线、节点高光、风险峰值和成员贡献，远征最近结算凭证卡片可直接回看矿洞探索记录；该字段不进入奖励 payload，不影响结算幂等和奖励落账。
- 新增通用 `VisualSceneBoard` 场景物件板：可按 `visual_state.objects` 渲染场景热区、物件状态、点击详情、进度条、协作人数、动作入口和移动端物件列表，为灯会共建、好友庄园照料与腊八共灶接入提供组件底座。
- 新增通用 `VisualTrackBoard` 赛道板：可按 `visual_state.tracks` 渲染轨道格、队伍 / 船只标记、格子事件、风险 / 奖励预览、冲刺 / 横流 / 弯道 / 终点样式和多队位置列表；在线节会页会在 `board_type=track` 时接入赛道视觉层。
- 端午赛舟接入真实服务端轨道推进：`dragon_boat / squad_coop` 房间会生成 8 格龙舟河道，包含鼓点窗口、横流、弯道、冲刺段和终点；`sync_oar / steady_rudder` 行动会推进船位、更新队伍状态、最近反馈、高光和视觉版本，回合推进后可断线恢复到权威房间状态。
- 端午赛舟结算凭证新增 `dragon_boat` 路线回看：服务端会保存完整河道、当前冲线状态、行动高光、压力峰值和成员贡献；节会房间、本房凭证、最近凭证与纪念页聚合凭证可展示成绩单，该字段不进入奖励 payload，不改变结算幂等。
- 端午赛舟成绩单补齐名次、人气与称号回看：`route_replay.race_result / race_rankings` 会记录合作 / 竞速模式、队伍排名、冲线状态、龙舟称号标签和节会人气加成；这些字段仍只用于凭证回看，不改变奖励落账。
- 村社修桥接入异步共建视图：在线村社 snapshot 会返回 `visual_state.async_projects`，修桥按搭脚手架、铺桥面、修栏杆、挂灯通行四阶段展示断桥现场；公共建设页新增 `AsyncCommunityBoard`，贡献按钮继续走服务端权威扣款 / 扣材料接口，并展示贡献榜、里程碑、历史纪念和最近反馈。
- 村社修桥完工效果补齐：修桥完工后会在公共工程快照、异步现场历史和村社史册中读回“溪桥通行增益”和“桥头纪念碑”；该效果只作为公共回看和纪念字段，不发放个人资产奖励。
- 村社修桥新增施工行动贡献：公共工程新增 `labor_shift` 施工行动包，不消耗大宗材料，单人 24 小时 1 次 / 7 天 3 次；服务端会按贡献历史拦截重复提交，并把施工行动写入贡献榜、异步现场和 online smoke。
- 灯会共建样板接入真实 `visual_state.objects`：`lantern_fair` 房间会返回主灯、灯谜架、彩绳灯线、节会摊位、人群秩序和留影点，行动会推进物件状态、进度、处理人、最近反馈、高光和视觉版本。
- 在线节会房间接入 `VisualSceneBoard` 灯会现场：玩家可从“灯会共建”快捷入口创建上元灯会房间，并通过场景热区提交玩法行动；旧玩法动作卡继续保留为降级入口。
- 好友庄园照料接入场景物件：公开庄园快照会返回田地、果树、畜棚、鱼塘、蜂箱和花圃 `visual_state.objects`，庄园页可用 `VisualSceneBoard` 提交浇水、喂食、除虫、除草、收拾掉落物和安抚动物等照料动作。
- 庄园照料新增服务端安全边界：访问 / 照料权限支持公开、好友、互关、关闭四档，照料按访客每日 4 次、庄园每日 12 次和单物件进度限额校验，并记录幂等键、主人收益、访客伴手礼和照料日志；新增 `qa:manor-care` 覆盖权限、幂等与次数限制。
- 有限制偷菜接入庄园场景物件：主人可用偷菜权限控制公开 / 好友 / 互关 / 关闭，访客只可轻采普通成熟作物、普通果实或边角产物；服务端按 `庄园 + 访客 + 日期 + 目标` 幂等，限制访客每日 2 次、庄园每日 6 次和单物件每日 1 次，并写入主人日志、访客奖励与主人补偿记录；新增 `qa:manor-steal`。
- 新增首批作物用途标签：稻米、芝麻、莲子、桂花、红薯、南瓜、萝卜、茶叶、桃子和辣椒已拥有料理、炼丹、加工、宠物粮、赠礼、订单、节会等用途说明；背包作物详情和物品图鉴会显示用途标签、风味、药性、消耗定位和推荐用途。
- 接入加工链第一批料理出口：新增米粉卷、芝麻汤圆、赛舟辣南瓜饭，消耗米粉、萝卜干、芝麻酱、南瓜酱、泡椒、芝麻油等加工产物；物品百科现在会把料理也纳入“可用于”追踪。
- 接入炼丹第一批数据链：工坊新增丹炉，丹炉可炼制清心莲丹、温阳薯丸、辛火行气丸、桂露凝神丹和石根护脉丸；丹药已进入背包筛选、出售筛选、物品图鉴分类和百科搜索，当前暂不直接食用或叠加生效。
- 接入宠物喂食第一批：宠物可每日消耗一次稻米、芝麻、莲子、桂花、红薯、南瓜、萝卜、桃子等作物获得口味反馈、好感和次日低概率小物带回；稀有带回有冷却，作物百科可搜索宠物口味、偏好和反馈。
- 节庆筹备接入异步广场视图：在线村社公共建设新增 `festival_square` 工程，广场按备料、搭场、彩排、开幕四阶段展示空场变现场；灯笼、食材、布景、题签、节目贡献包走服务端权威扣款 / 扣材料，并会点亮对应现场物件、贡献榜和历史回看。
- 节庆筹备补齐完工解锁：`festival_square` 完工后会读回上元灯会房间解锁、节庆人气预热和开幕留影位；异步共建现场提供去创建正式节会房间的入口，村社史册与 online smoke 可读回公共奖励和纪念。该效果只做公共预热与纪念，不发个人资产。
- 公共订单接力接入路线视图：在线委托多段接力单会返回 `visual_state.async_projects`，按阶段展示接单、交付、确认里程碑、贡献者排行、历史回看和完成反馈；在线委托页复用 `AsyncCommunityBoard` 展示接力路线，结算、补偿、声望和幂等凭证仍沿用现有委托服务端闭环。
- 公共订单接力补齐订单板浏览：在线委托 overview 新增 `board_summary`，统计订单总数、开放订单、接力单和开放接力单；在线委托“可接”列表新增全部 / 普通 / 接力单筛选、接力单 badge 和阶段进度条，便于从订单板直接识别接力状态。
- 共建花灯墙接入异步公共工程：在线村社新增 `lantern_wall`，支持写愿望、挂灯、修灯、赠灯和好友留言五类贡献；`AsyncCommunityBoard` 会展示愿望签、灯架、修灯台、赠灯区、好友留言和纪念墙，完工后在公共工程、异步现场历史和村社史册读回花灯墙纪念与好友祝福册。
- 随机来访 NPC 第一版接入村民页：每周生成 1-2 位受控短访 NPC，展示人物卡、来历、偏好、三选一对话和小订单模板；对话会改变好感与关系标签，喜欢的来客可先记入熟人册占位，短访与旧日摘要都有存档上限。
- 随机 NPC 熟人册第一版接入村民页：记入熟人的来访者会保存人物快照、关系标签、好感、偏好、小订单线索、家庭线索、初见 / 最近见面和关键事件；熟人册最多 12 人，读档会按模板白名单清洗并兼容旧 `acquaintanceIds`。
- 随机 NPC 长住第一版接入村民页：熟人好感达到 70 后可邀请为长住，最多 3 人；长住条目会保存完整人物卡快照、驻村路线、阶段占位、家庭背景、小订单线索和关键事件，读档会按模板 / 路线白名单清洗并兼容旧档缺字段。
- 长住随机 NPC 文游对话第一版接入：四条驻村路线各有 3 段事件，玩家每天可选择一次回应推进标题、开场、好感、关系标签、阶段和关键事件；事件 ID 受上限保存，不引入恋爱、家庭收益或无限文本。
- 家族关系图第一版接入 NPC 页：新增只读 `FamilyRelationGraph`，以玩家为中心展示固定 NPC、随机来访、熟人、长住 NPC、配偶 / 知己 / 恋人、孩子、宠物和仙灵；关系线带标签，节点可点击查看最近对话、送礼偏好、关系事件、家庭心愿和随机 NPC 关键事件。
- 联机同居契约服务端第一版接入：新增 `taoyuanCohabitationRuntime` 和契约 API，支持好友前置、恋人 / 婚姻 / 知己 / 结拜 / 合伙 / 临时共耕关系类型、双人或 2-4 人上限、默认权限模板、幂等创建、接受激活、共同基金占位、分居预览草案和在线审计；新增 `qa:cohabitation-contract`。
- 联机同居合并农田地图只读快照接入：已激活契约可通过 `shared-map` 接口读取双方主农田横向拼接布局，逐地块保留来源账号 / 存档 ID、原地块 ID、当前管护者、权限模式和作物摘要；该接口不写回个人存档，不合并个人铜币，也不开放共同种植 / 浇水 / 收获写操作。
- 联机同居共同仓库服务端第一版接入：已激活契约成员可查看共同仓库，并通过幂等 `warehouse/deposit` 接口从个人背包放入普通物品；流水会记录来源玩家、来源存档 / 槽位、来源背包、时间、操作者和补偿提示，重复幂等键不会重复扣物或加仓，取出 / 卖出 / 共同产出自动入仓仍未开放。
- 联机同居共同基金服务端第一版接入：已激活契约成员可查看共同基金，并通过幂等 `fund/contribute` 从个人铜币自愿注资；流水会记录出资玩家、来源存档 / 槽位、用途、操作者和补偿提示，重复幂等键不会重复扣钱或加余额，消费 / 自动收入 / 前端入口仍未开放。
- 联机同居权限面板服务端第一版接入：已激活契约成员可读取农田、动物、仓库、建设、资金、家庭和确认安全阀分组；契约发起者可通过幂等 `permissions` 接口调整成员权限，变更写入审计，稀有取出 / 大额基金 / 拆建筑 / 分居预览确认安全阀保持强制开启。
- 联机同居离线经营状态第一版接入：已激活契约成员可读取 `offline-status`，查看成员最近活跃、共同日志、无需全员在线的能力边界和暂缓的离线自动收益 / 冲突合并能力；该接口不发放离线收益，也不改写个人存档。
- 联机同居分居演算预览第一版加强：`separation-preview` 现在返回 `version=1` 返还清单草案，包含来源田区、共同仓库流水、共同基金注资比例 / 建议返还、冷静期、双方确认状态、补偿计划和安全检查；该接口仍只做预览，不执行个人存档写回或资产返还。
- 家族庄园职位服务端第一版接入：结拜 / 合伙庄园可读取六类职位面板，契约发起者默认家主并可通过幂等 `roles` 接口调整非家主成员职位；职位变更会重算权限模板并写入审计，恋爱 / 婚姻同居仍保持双人边界。
- 家族 / 合伙多人土地拼接只读摘要接入：`shared-map` 现在会输出成员区域顺序、区域数量、横向拼接轴、来源追踪、职位标签和暂缓写操作；QA 已覆盖三人结拜与四人合伙共同农田快照，读取地图不写回个人存档。
- 家族共同仓库只读摘要接入：结拜 / 合伙庄园的 `warehouse` 快照会输出成员职位、管仓权限预览、来源玩家汇总、取出 / 卖出暂缓和分居返还策略；家族放入流水会记录操作者与来源玩家职位标签，继续不开放取出写操作。
- 家族订单只读预备面板接入：结拜 / 合伙庄园新增 `family-orders` 快照，输出成员职位、订单阶段草案、公共订单接力复用边界、共同基金 / 仓库结算暂缓和幂等 / 审计 / 补偿 / 回滚要求；该接口不写审计、不改个人存档，也不新增订单写接口。
- 家族声望只读预备面板接入：结拜 / 合伙庄园新增 `family-reputation` 快照，按现有职位审计、共同仓库放入和共同基金注资流水生成等级与来源预览，并声明未来声望写入所需的幂等、审计、周封顶、反刷和补偿要求；该接口不持久化声望、不发奖励、不改个人存档。

- 修复钓鱼垃圾率缺少上限夹钳的问题：坏运、环境窗口、鱼饵和等级修正叠加后，垃圾判定概率现在会统一限制在 `0% ~ 100%`，避免极端配置让钓鱼主循环长期只出垃圾。
- 修复服务端云存档坏 JSON 被静默当成空档的问题：读取会显式报错，写入会先校验现有文件，损坏时阻止覆盖原文件，并新增坏档保护 QA。
- 修复联机发布开关漏管远征、邻里和订阅入口的问题：远征房间拥有独立 `expedition` 模块 / 功能开关，邻里与订阅路由统一纳入 `social` 发布守卫，并新增守卫覆盖 QA。
- 修复大厅隐藏图片可从 `/api/taoyuan/hall/uploads` 绕过可见性检查的问题：主路径与 API 静态挂载现在都会先执行上传图片可见性守卫。
- 修复 `/api/me` 瞬时失败导致账号上下文被清成 guest 的问题：只有确认 401 未登录才会清账号，网络抖动和网关错误会保留当前账号上下文。
- 修复邮箱 Pinia 状态在登录、退出或账号作用域重载后未清理的问题：邮箱列表、未读角标、详情缓存、抵达提示、收发件记录会随账号切换归零。

- `0522拆分todo.md / 阶段 J2（村社）` 这一轮补齐在线村社核心操作验收：在线村社模块能通过拆分页完成创建村社、申请加入、接受成员、职位调整、仓库入仓、公共建设贡献和提案投票写回验证。
- `qa:online-regression-live-smoke` 新增村社核心操作 smoke，使用社长与申请人两套会话验证村社创建、成员治理和权限入口；仓库与建设操作会从服务端存档读回扣款 / 扣木材，提案投票从 society overview 读回票数与当前投票。

- `0522拆分todo.md / 阶段 J2（远征）` 这一轮补齐在线远征核心操作验收：在线节会的远征房间标签能通过拆分页完成远征创建、邀请、加入、ready、倒计时、洞窟回合动作、结算和关闭写回验证。
- `qa:online-regression-live-smoke` 新增远征核心操作 smoke，使用主人与队友两套会话验证远征洞窟房间状态流转；结算生成双人凭证，关闭后分别从主人 / 队友视角读回 persisted 凭证并确认奖励写回双方存档。

- `0522拆分todo.md / 阶段 J2（节会）` 这一轮补齐在线节会核心操作验收：在线节会模块能通过拆分页完成世界事件贡献、节会房间创建、邀请、加入、ready、倒计时、玩法动作、结算和关闭写回验证。
- `qa:online-regression-live-smoke` 新增节会核心操作 smoke，使用主人与访客两套会话验证世界事件贡献扣款从服务端存档读回；节会房间结算会生成双人凭证，关闭后分别从主人 / 访客视角读回 persisted 凭证并确认奖励写回双方存档。

- `0522拆分todo.md / 阶段 J2（委托）` 这一轮补齐在线委托核心操作验收：在线委托模块能通过拆分页完成发布求助单、接单、交付、发布人确认、结算凭证和补偿重试入口验证。
- `qa:online-regression-live-smoke` 新增委托核心操作 smoke，使用发布人与接单人会话验证发布 / 接单 / 交付从服务端 orders / receipts 读回；通过接单人暂缺服务端存档制造真实待补偿，再补存档并从 UI 重试补偿，验证补偿 resolved 且奖励写回存档。

- `0522拆分todo.md / 阶段 J2（邻里）` 这一轮补齐在线邻里核心操作验收：邻里模块能独立刷新并完成名片保存、好友驿站入口、邻里创建、外部申请和成员邀请的真实读写验证。
- `qa:online-regression-live-smoke` 新增邻里核心操作 smoke，使用申请人、被邀请人与社长会话分别验证邻里申请 / 邀请写入，并从服务端 overview 读回；同时修正在线邻里管理权限从成员列表兜底推导，避免社长入口被误隐藏。

- `0522拆分todo.md / 阶段 J2（庄园）` 这一轮补齐在线庄园核心操作验收：庄园模块能独立刷新快照，完成主题保存、访客留言、主人回复、留言置顶、来访记录、导览保存和收藏 / 关注概览验证。
- `qa:online-regression-live-smoke` 新增庄园核心操作 smoke，使用访客与庄园主两套会话写入并从服务端快照读回；验证已通过 `type-check`、`build`、`qa:online-regression-live-smoke`、`node --check` 和 `git diff --check`。

- `0522拆分todo.md / 阶段 J3` 这一轮补齐移动端在线中心专项验收：在线中心顶部新增五个紧凑快捷入口，让 390x844 / 360x780 首屏能直接识别庄园、邻里、委托、节会、村社五条分流。
- `qa:mobile-ui-smoke` 新增在线中心与在线委托移动端场景，覆盖模块入口可见性、二级导航切换、发布表单字段和主要按钮不被裁切；截图与 summary 已落在 `docs/ui-smoke-2026-04-26/`。

- `0522拆分todo.md / 阶段 J0-J1-J4` 这一轮扩展在线 live smoke：从移动地图进入在线中心、在线中心进入五个拆分模块并返回、直接访问五个子入口，以及旧 `social / manor / festival / society / expedition` 入口带上下文落到新结构。
- 验证已通过 `type-check`、`build`、`qa:online-ui-structure`、`qa:online-regression-live-smoke` 和 `git diff --check`；原有云存档、邮箱、大厅与 realtime 业务 smoke 保留在同一脚本中，没有把业务回归退化成纯页面跳转。

- `0522拆分todo.md / 阶段 I2` 这一轮补上 `qa:online-ui-structure` 静态 smoke，固定在线拆页后的输入控件复用、长列表滚动边界、默认标签和历史 / 史册 / 纪念类内容归属。
- 静态检查当前覆盖 68 个表单控件与 59 处滚动边界；同时修正庄园模板选择误用 `online-input` 的问题，并把村社史册页从最终兜底分支改成显式 `chronicles` 标签。

- `0522拆分todo.md / 阶段 I2（部分）` 这一轮新增 `OnlineScrollArea.vue`，并把在线委托的可接列表、我的发布、我的接单、结算凭证和补偿重试五个长列表统一收入口径一致的滚动容器。
- 本轮只收口在线委托列表外壳，不改发布、接单、交付、确认、补偿重试等联机写操作，也不改服务端接口、结算、补偿或审计规则。

- `0522拆分todo.md / 阶段 I1` 这一轮抽出 `OnlineModuleCard.vue`，在线中心首页五张模块卡统一使用同一展示组件，支持模块名、摘要、状态 / 错误、统计、图标和进入按钮。
- 模块卡保留稳定最小高度与摘要 / 状态预留行高，减少不同模块文案长度造成的首页跳动；本轮只调整首页展示组件，不改摘要刷新、联机写操作、服务端接口、结算、补偿或治理权限。

- `0522拆分todo.md / 阶段 I0` 这一轮抽出 `OnlineModuleShell.vue`，统一在线庄园、邻里、委托、节会、村社五个模块的标题、摘要、刷新按钮、返回在线中心、统计区和二级导航。
- 五个模块主体内容和写操作保持原样，不改服务端接口、结算、补偿、治理权限或审计规则；二级导航继续使用横向滚动，避免手机端遮挡内容。

- `0522拆分todo.md / 阶段 H1` 这一轮把好友驿站内部跳转改成直达新在线子页：访问庄园进 `/game/online/manor`，节会 / 远征邀请进在线节会对应标签，村社邀请进在线村社成员页，协作委托进在线委托发布页。
- 好友上下文继续透传 `target_username / target_save_id / source`，在线委托现在会读取 `tab=publish` 并在路由目标变化时重套 `scope / target` 草稿；邮箱写信和送礼仍保留原 `mail` 路由上下文监听。

- `0522拆分todo.md / 阶段 H0` 这一轮把旧联机入口迁到在线中心：`/game/social`、`/game/manor`、`/game/festival`、`/game/society` 和 `/game/expedition` 保留原 route name，但会带 query / hash 重定向到对应在线子页，远征旧入口会落到在线节会的远征标签。
- 在线庄园、在线邻里和在线村社移除了“返回旧长页”的过渡按钮与文案，任务页继续保留单人任务板并提供在线委托入口；本轮不改服务端接口、结算、补偿或审计规则。

- `0522拆分todo.md / 阶段 G3` 这一轮把在线村社剩余四个标签补成独立功能页：仓库与福利页支持公共仓库入仓、福利进度、专属节会 / 装饰 / 任务查看，公共建设页支持贡献包提交和最近捐献查看。
- 提案页支持创建、投票和归档，史册页展开成立日期、职位历史、公共建设、节会参与、贡献成员和关键事件时间线；所有写操作继续复用 `useSocietyStore` 现有接口，不改服务端权限、幂等、审计或补偿规则。

- `0522拆分todo.md / 阶段 G2` 这一轮把在线村社“成员”标签补成治理页：成员列表可直接查看职位与存档，拥有权限的身份可邀请玩家、处理入社申请 / 邀请并调整非社长成员职位。
- 成员治理继续复用 `useSocietyStore.inviteMember()`、`acceptRequest()`、`rejectRequest()` 和 `changeMemberRole()`，并按 `can_invite / can_review_requests / can_manage_roles` 显示控件，普通成员只看到读态成员摘要。

- `0522拆分todo.md / 阶段 G1` 这一轮把在线村社“总览”补成可操作入口：已加入玩家能看到当前身份、社长、入社条件、福利 / 建设 / 提案摘要和村社公告。
- 未加入玩家可在 `/game/online/society` 直接创建村社、查看个人邀请 / 待处理申请，并从公开村社列表申请加入；公告保存、创建、申请和邀请接受 / 拒绝继续复用 `useSocietyStore` 现有写路，不改服务端权限、审计或结算规则。

- `0522拆分todo.md / 阶段 G0` 这一轮把 `/game/online/society` 从占位页升级为在线村社模块壳，接入村社摘要、独立刷新、返回在线中心和“总览 / 成员 / 仓库与福利 / 公共建设 / 提案 / 史册”二级导航。
- 村社模块总览会显示我的村社、公开村社和未加入时的创建 / 申请入口；村社拆页主路径已随 G1-G3 迁入，旧村社页暂保留兼容入口。

- `0522拆分todo.md / 阶段 F3` 这一轮把远征房间迁入在线节会“远征房间”标签：创建远征、我的房间、邀请、可见房间、事件卡、队伍资源、职责分工、回合日志和结算凭证都能在新页内处理。
- 远征 ready / unready、倒计时、断线 / 重连、玩法动作、结算、关闭和离开继续调用 `useExpeditionRoomStore` 现有写路，不改服务端远征房间生命周期、结算、补偿或审计规则。

- `0522拆分todo.md / 阶段 F2` 这一轮把节会房间迁入在线节会“节会房间”标签：我的房间、待处理邀请、创建表单、可见房间和最近结算凭证都能在新页内完成。
- 节会房间的邀请、加入、离开、ready / unready、倒计时、断线 / 重连、玩法动作、结算和关闭继续调用 `useFestivalRoomStore` 现有写路，不改服务端房间生命周期、结算或审计规则。

- `0522拆分todo.md / 阶段 F1` 这一轮把世界事件内容迁入在线节会“世界事件”标签：当前季节大事件、可提交贡献、贡献榜、我的季节记录、公共目标、世界事件列表、最近史册和世界纪年都能在新页内查看。
- 世界事件贡献按钮继续调用 `useWorldEventStore.contribute()`，不改服务端奖励、补偿或审计规则；史册、纪年和贡献记录使用限制高度的滚动区，避免把当前操作推到页面后段。

- `0522拆分todo.md / 阶段 F0` 这一轮把 `/game/online/festival` 从占位页升级为在线节会模块壳，接入世界事件、节会房间和远征房间摘要，并提供独立刷新与返回在线中心。
- 在线节会页新增“世界事件 / 节会房间 / 远征房间 / 纪念记录”二级导航；贡献、创建、ready、断线恢复和结算等写操作仍先通过旧节会页与旧远征页承接，后续按 F1-F3 迁入。

- `0522拆分todo.md / 阶段 E0` 这一轮收口任务页旧在线求助单：`QuestView.vue` 移除了发布、接单、交付、确认、凭证与补偿长区，不再在单人任务板里平铺在线委托操作。
- 任务页现在只保留主线、今日委托、特殊订单、经营提示和进行中任务主路径，并提供“前往在线委托”按钮，继续透传当前路由查询参数到 `/game/online/orders`。

- `0522拆分todo.md / 阶段 E3` 这一轮把在线委托“凭证与补偿”标签补成独立处理页：结算凭证会显示阶段、双方、回报、交付资源、交付说明、声望变化、奖励结果和关联补偿。
- 补偿列表显示原因、最近失败、尝试次数和更新时间，并给待处理补偿提供“重试补偿”按钮；写操作仍走 `useCoopOrderStore.retryCompensation()`。

- `0522拆分todo.md / 阶段 E2` 这一轮把在线委托“可接 / 我的接单 / 我的发布”标签补成可操作页：可接页支持整单接单和多段接力接段，接单页支持交付草稿、提交交付和取消接单。
- 我的发布页保留普通单与接力阶段的确认交付入口；互助声望摘要挪到接单相关标签侧栏，写操作继续复用 `useCoopOrderStore` 的接单、交付、取消和确认接口。

- `0522拆分todo.md / 阶段 E1` 这一轮把在线委托“发布”标签从摘要占位升级为实际发布表单，支持标题、描述、类别、范围、截止时间、回报类型、回报数值和回报说明。
- 发布页保留单阶段委托与多段接力单切换，多段模式可在卡片里维护阶段标题、类型、目标资源、数量和说明；提交仍复用 `useCoopOrderStore.submitOrder()` 与现有服务端校验。

- `0522拆分todo.md / 阶段 E0` 这一轮把 `/game/online/orders` 从占位页升级为在线委托模块壳，接入 `useCoopOrderStore`、独立刷新、摘要统计和“发布 / 可接 / 我的发布 / 我的接单 / 凭证与补偿”二级导航。
- 在线委托页会承接好友入口传来的 `scope / target_username / target_save_id`，并保留前往单人任务板的过渡入口；完整发布、接单、交付、凭证与补偿写操作后续按 E1-E3 继续拆入。

- `0522拆分todo.md / 阶段 D3` 这一轮把邻里组织管理迁入 `/game/online/neighbor` 的“邻里”标签：任务卡、创建邻里、申请加入、邀请玩家、成员、公告、角色调整和申请处理都在独立分区内完成。
- 邻里公共组列表改为独立滚动区域；公告、邀请和申请处理只给社长 / 管事入口，角色调整只给社长入口，避免普通成员看到无效治理控件。

- `0522拆分todo.md / 阶段 D2` 这一轮把在线邻里的“好友”标签收口为好友驿站入口和关系摘要，提供独立刷新，并显示好友、申请和黑名单数量。
- `FriendStationView.vue` 继续承接好友搜索、申请、列表、黑名单、访问庄园、写信、送礼、远征 / 节会 / 村社邀请和协作跳转，目标玩家上下文沿用 `target_username / target_save_id`。

- `0522拆分todo.md / 阶段 D1` 这一轮把公开名片预览和名片设置表单迁入 `/game/online/neighbor` 的“名片”标签。
- 头像上传、公开状态、手选标签和保存名片保留在名片首屏；史册、荣誉、纪念品、称号和成就卡默认收进“展示档案”，避免长列表压住编辑区。

- `0522拆分todo.md / 阶段 D0` 这一轮升级 `/game/online/neighbor` 为邻里模块壳：页面顶部提供名片、好友、邻里和订阅摘要，并支持独立刷新和返回在线中心。
- 邻里模块默认进入“名片”，好友主操作提供好友驿站入口，公开名片摘要和邻里组织摘要已经拆到不同标签。

- `0522拆分todo.md / 阶段 C4` 这一轮把在线庄园“来访”标签接上来访目的、记录输入、反馈输入和独立来访列表。
- “导览”标签迁入导览点新增、路线摘要和已设参观点列表；访客只看公开导览，庄园主人可直接维护导览点。

- `0522拆分todo.md / 阶段 C3` 这一轮把在线庄园“留言”标签接上留言类型、快捷留言、留言输入和独立滚动留言列表。
- 庄园主人仍可在新留言页回复与置顶留言；留言为空、加载中、失败都会在留言区域内显示状态，不再只放旧庄园长页里处理。

- `0522拆分todo.md / 阶段 C2` 这一轮把在线庄园“主题”标签接上封面上传、主题名保存、模板选择和模板预览，庄园主人可以在拆页后的主题页完成原有主题设置。
- 访客模式只展示公开主题、主图、模板、主题推荐和官方精选，不显示上传、模板选择或保存按钮；本轮继续复用现有庄园 store 和主题保存接口，没有改服务端规则。

- `0522拆分todo.md / 阶段 C1` 这一轮把 `ManorPreviewCard` 接入在线庄园“概览”标签，打开庄园模块先看到庄园快照、当前主题、来访摘要和收藏/关注状态。
- 概览页只保留跳往主题、留言、来访的短按钮，不展开主题表单、留言输入或来访记录长列表。

- `0522拆分todo.md / 阶段 C0` 这一轮升级 `/game/online/manor` 为庄园模块壳：页面顶部会识别自己的庄园或访客目标，提供独立刷新、返回在线中心和六个二级标签。
- 庄园模块默认停在“概览”，只展示快照摘要和短入口；主题、留言、来访、导览、收藏先做独立落点，完整旧庄园页作为过渡入口保留，避免迁移期间丢失管理操作。

- `0522拆分todo.md / 阶段 B0-B2` 这一轮把在线中心首页从静态入口卡升级为摘要中心：五张模块卡只显示模块说明、状态、小统计和进入按钮，并提供非遮挡的“刷新摘要”按钮。
- 摘要数据复用现有庄园、邻里、委托、节会/远征、村社 store；单个模块刷新失败只在对应卡片显示轻量错误，不影响其他模块入口。

- `0522拆分todo.md / 阶段 A2` 这一轮接好移动地图里的在线中心入口：手机端“联机主导航”默认先去在线中心，好友驿站保留轻快捷，五大联机模块不再挤成一排主入口。
- 单人告示板入口回到村落组，邮箱继续保留在常用工具；本轮验证通过前端 `type-check` 与 `build`，移动 UI smoke 在当前环境因 Playwright Chromium `spawn EPERM` 跳过。

- `0522拆分todo.md / 阶段 A0-A1` 这一轮建立游戏内在线中心入口：导航新增 `online` 面板，标签为“联机”，进入该面板不消耗移动时间，也不会触发店铺营业时间限制。
- 新增 `/game/online` 和庄园、邻里、委托、节会、村社五个在线子入口；当前子页先提供轻量模块壳和返回在线中心按钮，后续再逐步迁入原长页功能。
- 本轮没有改服务端接口、联机结算规则或个人存档结构，验证通过前端 `type-check` 与 `build`。

- `0520todo.md / 总执行原则` 已完成收口：三条联机主线按计划文档推进，未纳入 `0520全量审查计划.md`，每个大阶段均保留最小验证证据。
- 顶部任务队列现在只记录已完成状态，`0520todo.md` 已不再有未勾选执行项。

- `0520todo.md / Phase 4` 这一轮把更多远征模板接入共通动作协议：L82 组队采集、L83 护送抵运、L84 海探的动作现在会暴露 `required_role / combo_tags / round_effect` 等字段。
- 服务端远征动作权限会按动作职责检查，而不只限于矿洞样板；`qa:online-smoke` 已覆盖 L82/L83/L84 动作字段、角色执行顺序、运行、结算与关闭链路。
- `qa:online-smoke` 的 1 秒倒计时专项回归现在接受 `start` 响应已经物化到 `running` 的情况，避免慢环境下把合法倒计时推进误判成失败。

- `0520todo.md / A1` 这一轮收口“客户端只提交意图，不直接写最终结果”：服务端 WebSocket 消息入口只接受 `ping / presence.snapshot / notification.ack`，前端 realtime store 也只发送这三类轻消息。
- 好友、房间、邮箱、庄园、村社、邻里和协作单等联机写路仍由 HTTP 服务端权威结算；实时事件只推动前端静默重读权威接口，客户端伪造 `notification.created / activity.room.updated` 已有 `qa:realtime-smoke` 覆盖。

- `0520todo.md / A4` 这一轮收口 WebSocket 的实时职责边界：在线状态、好友申请推送、邀请和房间状态变化都由 realtime 事件投递，前端只静默重读权威接口。
- `qa:realtime-smoke` 已覆盖 presence、好友申请、活动房间创建 / 邀请 / 加入 / 更新，以及客户端伪造投递事件拦截。

- `0520todo.md / A6` 这一轮收口好友系统入口嵌入：好友驿站已把 `target_save_id` 带入庄园、邮箱 / 送礼、远征、节会、村社和协作单，下游写路继续由服务端解析并权威落盘。
- 现有联机玩法已复用同一套 realtime 通知底座：房间、邮箱、庄园、大厅、村社、邻里、协作单、四季大事件、邻里寄售、每周交换站和节庆摊位都只用事件推动静默刷新；`0520todo.md` 的 Phase 1 已标记完成。

- `0520todo.md / A4` 这一轮完成联机旧轮询审计：代码中没有 `EventSource`、`text/event-stream` 或联机数据常驻轮询残留。
- 现有定时器只用于节会小游戏倒计时 / 动画、全局游戏时钟、自动存档、realtime ping、服务端配置刷新和 heartbeat；手动刷新按钮保留为玩家主动重读权威接口。

- `0520todo.md / A5-A7` 这一轮把四季大事件贡献通知明确收口为在线-only：服务端改用 `emitOnlineUsersEvent` 投递，不再给断线贡献者写入离线补发队列。
- `qa:realtime-smoke` 新增断线 actor 贡献四季大事件的回归，验证在线观察者能收到摘要，但断线 actor 重连后 `pending_notification_count = 0` 且不补发 world_event。

- `0520todo.md / A1-A5` 这一轮补了一条 realtime 反注入回归：客户端伪造 `notification.created` 和 `activity.room.updated` 不会被服务器当成权威投递事件广播。
- `0520todo.md / A5` 里的“事件只负责投递，不负责最终结算”已按现有事件集收口，前端继续只静默重读权威接口，结算仍走 HTTP。

- `0520todo.md / A5-A7` 这一轮补齐村社公共建设与公共仓共享进度的离线补发验收：离线成员会在 WebSocket ready 后收到 `public_project_contributed / warehouse_deposited` 摘要。
- `qa:realtime-smoke` 现在会 ACK 这两类补发并重连确认不重复，同时校验通知仍不暴露 overview、成员列表、贡献列表或公共仓日志。

- `0520todo.md / A4` 这一轮收口邮箱入口旧轮询：`GameLayout.vue` 不再每 60 秒常驻刷新邮箱列表，改为进入游戏时刷新一次、页面回到前台时静默刷新一次。
- 邮箱新增仍由 realtime `notification.created` 驱动静默重读，前台恢复刷新只作为断线 / 浏览器后台节流后的轻量补偿，不改邮件领取、已读或奖励结算逻辑。

- `0520todo.md / A4-A6-A7` 这一轮把每周交换站与节庆摊位接入 realtime 在线轻通知：换物 / 购买成功后，服务端会向当前在线连接投递 `category: "exchange"` 的交易摘要。
- 前端收到 `weekly_exchange_station` 或 `festival_stall` source 后只静默重读对应摊位、交换账本与官方调控概览；通知不携带成本、奖励或完整交易记录，也不进入离线补发队列。
- `qa:realtime-smoke` 新增每周交换站与节庆摊位在线通知断言，确认摘要不暴露成本 / 奖励 / record，且在线通知不带 `queued_event_id`。

- `0520todo.md / A5-A7` 这一轮扩展 `qa:realtime-smoke` 的邻里 membership 离线补发覆盖：离线目标收到邻里邀请、离线申请人收到拒绝结果时，都会在下次 WebSocket ready 后补发并带 `queued_event_id / replayed`。
- 烟测会 ACK 两类补发通知并重连确认 pending 归零、不重复补发，继续校验通知摘要只作为投递证据，不触发成员结算。
- 本轮验证通过 `node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix server run qa:realtime-smoke` 与 `git diff --check`。

- `0520todo.md / A4-A6-A7` 这一轮把邻里申请 / 邀请 / 审核 / 公告 / 成员身份变更接入 realtime：服务端在写路成功后投递 `category: "neighbor"` 的摘要通知，前端收到后只静默重读邻里概览和公开名片。
- 邻里通知摘要只携带群组、申请和角色变更的轻量字段，不携带完整 overview 或成员明细；离线邻里成员会进入既有补发队列，ACK 后重连不重复。
- `qa:realtime-smoke` 继续补齐邻里邀请、拒绝、公告更新和成员身份调整的在线投递断言，并校验这些摘要不暴露成员列表或完整邻里概览。
- 本轮验证覆盖 `node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build` 与 `npm --prefix server run qa:realtime-smoke`。

- `0520todo.md / A0-A1-A7` 这一轮把村社旧 username-only 兼容收窄为安全兜底：当前账号已经存在多份服务端存档身份时，缺少 `save_id` 的旧村社成员 / 申请记录不会被任意活动存档直接认领。
- 村社成员与待处理申请匹配会先看明确 `save_id`；旧数据只在没有多存档歧义或唯一可映射时按 username 兼容，避免历史记录跨存档串用。
- 本轮验证通过 `node --check server/src/taoyuanSocietyRuntime.js`、`node --check server/scripts/qa-online-smoke.mjs`、`npm --prefix server run qa:online-smoke` 与 `npm --prefix server run qa:realtime-smoke`。

- `0520todo.md / A0-A1-A7` 这一轮修复服务端活动存档读取：`getActiveSaveContext()` 不再把未指定的 `preferredSlot = null` 误当成 slot 0，会真实读取 `active-slot`。
- 村社成员归属和待处理申请去重现在能按当前活动存档 ID 隔离；同一账号切到另一个服务端存档时，不会继承原存档的村社成员身份。
- 本轮验证通过 `node --check server/src/taoyuanSaveRuntime.js`、`node --check server/src/taoyuanSocietyRuntime.js`、`node --check server/scripts/qa-online-smoke.mjs`、`npm --prefix server run qa:online-smoke` 与 `npm --prefix server run qa:realtime-smoke`。

- `0520todo.md / A1` 这一轮补齐村社职位履历的存档身份：职位调整会记录目标成员 `save_id / save_slot`，社长离任转移会记录继任者存档身份。
- `qa:online-smoke` 已新增村社 chronicle 读回断言，覆盖 `role_assignment` 与 `president_transfer` 两类履历都不会退回 username-only。
- 本轮验证通过 `node --check server/src/taoyuanSocietyRuntime.js`、`node --check server/scripts/qa-online-smoke.mjs` 与 `npm --prefix server run qa:online-smoke`。

- `0520todo.md / A1-A6` 这一轮把村社申请 / 邀请投递结构收口到存档级：申请单、邀请单、成员快照和角色履历都会保存并回显目标存档 ID / 槽位。
- 村社概览会按当前活动存档过滤收到的邀请 / 待处理申请；玩家自我接受邀请时会校验当前活动存档必须匹配受邀存档，旧 `target_save_id = 0` 数据继续按 username 兼容。
- 本轮验证通过 `node --check server/src/taoyuanSocietyRuntime.js`、`node --check server/src/routes/api.js`、`node --check server/scripts/qa-online-smoke.mjs`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`npm --prefix server run qa:online-smoke` 与 `npm --prefix server run qa:realtime-smoke`。

- `0520todo.md / A1-A6` 这一轮继续把邮箱玩家来信 / 礼物包裹投递收口到存档级：投递记录、收件箱 / 发件箱返回和 realtime 邮件通知都会带 `target_save_id / target_save_slot`。
- 旧 username 收件路径继续保留；只有从好友入口或请求中带入目标存档 ID 时，邮箱投递才落目标存档字段，不改变既有领取结算。
- 本轮验证通过 `node --check server/src/taoyuanMailbox.js`、`node --check server/src/routes/api.js`、`node --check server/scripts/qa-online-smoke.mjs`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`npm --prefix server run qa:realtime-smoke` 与 `npm --prefix server run qa:online-smoke`。

- `0520todo.md / A1-A5` 这一轮继续把庄园留言 / 访问收口到存档级：留言和来访记录会保存 `target_save_id / target_save_slot`，留言通知也会回传庄园主人目标存档字段。
- 现有 username 兼容路径保留，庄园快照、留言板、来访记录与 realtime 通知都仍能按旧账号名工作。
- 本轮验证通过 `node --check server/src/taoyuanManorRuntime.js`、`node --check server/src/routes/api.js`、`node --check server/scripts/qa-online-smoke.mjs`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`npm --prefix server run qa:realtime-smoke` 与 `npm --prefix server run qa:online-smoke`。

- `0520todo.md / A1-A4` 这一轮把活动房间邀请从 username-only 持久结构继续收口到存档级：邀请记录和 realtime payload 会保存 / 回传 `target_save_id / target_save_slot`，加入房间时会校验当前活动存档必须匹配受邀存档。
- 前端远征 / 节会房间邀请类型已补目标存档字段；现有 username 兼容路径保留，旧邀请仍可按账号名识别。
- 本轮验证通过 `node --check server/src/taoyuanActivityRoomRuntime.js`、`node --check server/src/routes/api.js`、`node --check server/scripts/qa-online-smoke.mjs`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`npm --prefix server run qa:realtime-smoke` 与 `npm --prefix server run qa:online-smoke`。

- `0520todo.md / A0-A1` 这一轮收口 SaveIdentity 产品语义：公开数字 ID 只由服务端存档槽生成并持久化，纯本地未同步档不预生成公开 ID；本地档、导入档或云存档写入服务端后才补发并回写固定 ID。
- `0520联机WebSocket.md` 已同步该规则；`0520todo.md` 中“每个存档固定数字 ID”“昵称可改、ID 不可改”和 `SaveIdentity` 已按现有 `qa:online-smoke` / `qa:online-regression-live-smoke` 证据收口。
- 本轮为文档与任务队列语义收口，验证通过 `git diff --check`。

- `0520todo.md / A5-A7` 这一轮把邻里寄售通知从“仅在线成员”扩展为同邻里成员统一投递：在线成员即时收到摘要，离线成员进入既有 realtime 补发队列，ready 后补发并等待 ACK 清理。
- 邻里寄售补发仍只携带 `category: "exchange"`、挂单 ID / 状态、邻里范围和相关账号摘要，不包含物资明细、价格明细或 overview；队列继续受每用户上限与过期裁剪保护。
- 本轮验证通过 `node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs` 与 `npm --prefix server run qa:realtime-smoke`，覆盖离线邻里成员收到 queued 挂单通知、ACK 后重连不重复。

- `0520todo.md / A1-A4-A7` 这一轮把活动房间 realtime 订阅范围补成持久只读快照：房间 create / invite / join / leave / ready / action / settle / close 等事件广播前，会记录 domain、room_id、房主、订阅用户名、成员数、待处理邀请数、房间状态和最近动作。
- `/api/admin/taoyuan/realtime` 现在会返回 `recent_room_subscriptions`、按 domain / 状态聚合的房间订阅摘要和记录上限；快照不携带完整 room payload，不参与房间结算，只用于后台观测与断线排查。
- 本轮验证通过 `node --check server/src/taoyuanRealtimeRuntime.js`、`node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs` 与 `npm --prefix server run qa:realtime-smoke`。

- `0520todo.md / A1-A7` 这一轮把 realtime 在线状态补成轻量持久快照：WebSocket 连接、客户端消息和断开时会更新 `taoyuan_realtime_presence.json`，记录账号、存档 ID、槽位、在线 / 离线状态、连接时间、最近活跃时间和最近离线时间。
- `/api/admin/taoyuan/realtime` 现在会返回 `recent_presence`、`presence_status_counts`、presence 文件状态与记录上限，仍不暴露通知 payload 或玩法结算数据；在线状态本身继续由内存连接表权威判断，持久快照仅用于后台观测与重启后最近状态参考。
- 本轮验证通过 `node --check server/src/taoyuanRealtimeRuntime.js`、`node --check server/scripts/qa-realtime-smoke.mjs` 与 `npm --prefix server run qa:realtime-smoke`。

- `0520todo.md / A7` 这一轮给 `qa:online-smoke` 补了旧 wrapped 服务端存档读取回归：脚本会直接在 smoke 临时存储里放入无 `onlineIdentity` 的旧槽位，再通过 `/api/taoyuan/save/1` 打开并验证自动补发 ID、原玩家数据、背包、旧自定义字段和 meta 不丢失。
- smoke 父进程与被测服务端现在共用同一个临时 `DB_STORAGE`，可真实验证旧服务端 raw 的读取回写；用例还覆盖 `/api/taoyuan/save/slots` 可见性和旧槽位设为当前槽后再恢复。
- 本轮验证通过 `node --check server/scripts/qa-online-smoke.mjs` 与 `npm --prefix server run qa:online-smoke`。

- `0520todo.md / A4-A6-A7` 这一轮把邻里寄售接进 realtime 在线摘要通知：邻里挂单创建、购买、取消和过期回收成功后，服务端会向同邻里的当前在线成员投递 `category: "exchange"` 的 `neighbor_consignment_updated` 摘要。
- 前端收到寄售通知后只防抖静默重读 `/api/taoyuan/exchange-station/neighbors/consignments`、`/ledger` 与 `/governance` 权威接口，不直接套用挂单、成交或资金结果；通知摘要也不携带物资明细、价格明细或 overview。
- 本轮验证通过 `node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix taoyuan-main run type-check` 与 `npm --prefix server run qa:realtime-smoke`。

- `0520todo.md / A4-A6-A7` 这一轮把村社公共建设与公共仓共享进度接入 realtime 在线摘要通知：公共建设捐献成功后会投递 `public_project_contributed`，公共仓补货成功后会投递 `warehouse_deposited`，收件人限定为同社当前在线成员与操作人。
- 前端继续复用现有 `category: "society"` 静默刷新路径，只重读 `/api/taoyuan/online/societies` 权威概览；通知摘要不携带 overview、成员列表、公共建设贡献明细或公共仓日志明细，也暂不进入离线补发队列，避免高频共建动作刷满 queue。
- 本轮验证通过 `node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix server run qa:realtime-smoke` 与 `git diff --check`。

- `0520todo.md / A4-A6-A7` 这一轮把四季大事件贡献接入 realtime 在线轻通知：贡献写路成功后，服务端会向当前在线连接投递 `category: "world_event"` 的 `contribution_created` 摘要。
- 前端收到四季大事件通知后只防抖静默重读 `/api/taoyuan/online/world-events` 权威概览，不直接套用 payload；通知摘要不携带 overview、贡献者列表或日志明细，也不会把全服事件刷进离线队列。
- 本轮验证通过 `node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`npm --prefix server run qa:realtime-smoke` 与 `git diff --check`。

- `0520todo.md / A0-A1` 这一轮把公开名片页也接上当前运行存档 ID：`SocialView.vue` 会显示只读存档 ID 与槽位，并明确提示昵称 / 名片可改、ID 由服务端生成且固定。
- 本轮只补身份展示语义，不改公开名片保存、邻里、订阅或好友主操作；验证通过 `npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build` 与 `git diff --check`。

- `0520todo.md / A5-A6-A7` 这一轮把定向协作单创建接入 realtime 通知：服务端发布带 `target_save_id` 的协作单后，会把 `order_created` 摘要投递给解析出的目标存档账号。
- 协作单通知收件人现在包含 `target_username`，通知摘要会带 `target_save_id / target_save_slot / target_username`，但不泄露求助正文、交付条目等详细内容。
- `qa:realtime-smoke` 已新增在线目标好友收到定向协作单创建通知，以及离线目标好友 ready 补发、ACK 清理和重连不重复补发的回归；本轮验证通过 `node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix server run qa:realtime-smoke` 与 `git diff --check`。

- `0520todo.md / A0-A1-A6-A7` 这一轮把协作单定向发布接进存档 ID：好友驿站跳到协作单时带入的 `target_save_id` 会被创建页保存、展示，并在发布求助单时随 payload 提交。
- 服务端协作单创建会通过 `SaveIdentity` 解析目标存档，校验当前活动存档与目标存档确为好友后，写入 `target_save_id / target_save_slot / target_username` 等定向字段；目标存档玩家的概览可看到该定向求助单。
- `qa:online-smoke` 已新增定向协作单回归：传入 `target_save_id` 时服务端会强制 friends scope、写回目标存档字段，让目标存档玩家在协作概览中看到并接下该求助单，同时拒绝非好友存档 ID 的定向发布。
- 本轮验证通过 `node --check server/src/routes/api.js`、`node --check server/src/taoyuanCoopOrderRuntime.js`、`node --check server/src/taoyuanSocialRuntime.js`、`node --check server/scripts/qa-online-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`npm --prefix server run qa:online-smoke` 与 `git diff --check`。

- `0520todo.md / A0-A1-A5-A6-A7` 这一轮把庄园目标页接进存档 ID：好友驿站带入庄园的 `target_save_id` 会用于读取目标公开庄园快照，并在留言 / 访问记录提交时继续传给服务端。
- 服务端 `GET /api/taoyuan/online/manor?target_save_id=...`、庄园留言和访问写路会通过 `SaveIdentity` 解析目标账号，再复用现有 username 庄园数据结构；庄园 realtime 通知也已验证只携带目标存档 ID 时可以投递和离线补发。
- 本轮验证通过 `node --check server/src/routes/api.js`、`node --check server/src/taoyuanManorRuntime.js`、`node --check server/scripts/qa-online-smoke.mjs`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`npm --prefix server run qa:online-smoke`、`npm --prefix server run qa:realtime-smoke` 与 `git diff --check`。

- `0520todo.md / A0-A1-A5-A6` 这一轮把邮箱好友互动写路接进存档 ID：好友驿站带入邮箱的 `target_save_id` 会被写信 / 送礼页面保存到草稿，提交玩家来信或礼物包裹时随 payload 发给服务端。
- 服务端邮箱写入会优先用 `SaveIdentity` 解析 `target_save_id`，再复用现有 username 投递结构；玩家来信 / 礼物包裹返回 `recipient_username`，realtime 通知也用解析后的收件账号投递。
- 本轮验证通过 `node --check server/src/taoyuanMailbox.js`、`node --check server/src/routes/api.js`、`node --check server/scripts/qa-online-smoke.mjs`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`npm --prefix server run qa:online-smoke`、`npm --prefix server run qa:realtime-smoke` 与 `git diff --check`。

- `0520todo.md / A0-A1-A6` 这一轮继续把好友互动下游从 username 兼容上下文收口到存档 ID：好友驿站带入远征 / 节会 / 村社的路由参数后，页面草稿会保留 `target_save_id`，提交邀请时优先发送存档 ID。
- 服务端远征 / 节会房间邀请与村社邀请新增 `target_save_id` 解析路径，会用 `SaveIdentity` 找到对应账号后复用现有房间 / 村社 username 成员结构；空字符串不会被误判成 `0` 号存档，非法 ID 会明确报错。
- `qa:online-smoke` 与 `qa:realtime-smoke` 已改为用好友目标存档 ID 覆盖远征 / 节会 / 村社邀请写路和 WebSocket 投递；本轮还通过前端 `type-check` / `build` 与服务端 node check。

- `0520todo.md / A0-A1` 这一轮继续收口好友关系的存档级语义：前端社交 store 已移除 username-first 的好友申请和拉黑主入口，好友驿站主操作只通过 `target_save_id` 发起申请、拉黑与解除拉黑。
- `onlineProfileApi` 的好友申请 / 拉黑 payload 已收窄为对象结构，不再把裸字符串自动转成 `target_username`；旧数据缺少 `blocked_save_id` 时仍保留用户名解除拉黑兜底，避免破坏历史拉黑列表。
- 本轮已通过 `npm --prefix taoyuan-main run type-check` 与 `npm --prefix taoyuan-main run build`；后续继续让庄园、邮箱、节会、村社和协作等互动下游更明确消费存档 ID。

- `0520todo.md / A4-A6` 这一轮把村社申请、邀请和审核结果接进 realtime 通知底座：申请加入、邀请加入、接受申请和拒绝申请成功后都会投递 `notification.created`，使用 `category: "society"` 与只读 membership 摘要。
- 村社 membership 通知不携带村社 overview / members 等完整数据，只包含村社、申请单、操作人和刷新要求；离线玩家重连后会补发并可 ACK 清理，避免重复补发。
- `server/src/index.js` 现在会保留显式传入的 `PORT`，避免 `qa:realtime-smoke` 换端口时被 `.env` 覆盖回 4013；本轮验证通过 `node --check server/src/index.js` 与 `$env:TAOYUAN_REALTIME_SMOKE_PORT='4713'; node server/scripts/qa-realtime-smoke.mjs`。

- `0520todo.md / A3` 这一轮纠正好友驿站入口层级：好友主操作已从 `RegionMapView.vue` 抽出为独立 `FriendStationView.vue`，行旅图不再承载好友面板。
- 移动端“联机主导航”新增好友入口，`SocialView.vue` 的迁移卡也改为直达好友驿站；原 `region-social-*` smoke 锚点保留在新页面，降低回归脚本迁移成本。
- `qa:mobile-ui-smoke`、`qa:online-regression-live-smoke` 与 `qa:region-friend-panel-live-smoke` 已改为通过 `/game/friend-station` 或联机主导航好友入口验证好友驿站。

- `0520todo.md / A4-A6` 这一轮把庄园留言墙接进 realtime 通知底座：访客留言成功后通知庄园主人，庄园主人回复后通知留言作者，均使用 `notification.created` + `category: "manor"` 投递。
- 庄园通知 payload 只包含庄园主人、留言 ID、留言类型、作者、是否已回复、置顶状态和时间戳等摘要，不携带留言正文或回复正文；前端收到后只在当前已有庄园快照时静默重读权威庄园接口。
- `qa:realtime-smoke` 已覆盖庄园留言 / 回复在线通知，以及离线庄园主人重连补发 / ACK / 不重复补发；本轮验证通过 `node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`npm --prefix server run qa:realtime-smoke` 与 `git diff --check`。

- `0520todo.md / A4-A6` 这一轮把协作单参与态变化接进 realtime 通知底座：接单、取消接单、阶段接单 / 取消、提交交付、确认交付和补偿重试成功后，服务端会向发布人 / 接单人等相关参与者投递 `notification.created`，payload 使用 `category: "coop_order"`、动作名与只读摘要，不携带交付物明细。
- 前端 `useRealtimeStore` 收到 `coop_order` 后只防抖调用 `useCoopOrderStore().refreshOverview({ silent: true })` 重读 `/api/taoyuan/online/orders` 权威概览，不直接套用 WebSocket payload；`useCoopOrderStore` 补了 silent 刷新模式，避免实时回读抖动 loading / error。
- `qa:realtime-smoke` 已覆盖在线协作单接单通知，以及离线发布人重连补发 / ACK / 不重复补发；本轮验证通过 `node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`npm --prefix server run qa:realtime-smoke` 与 `git diff --check`。

- `0520todo.md / A1` 这一轮补上实时状态的管理端观测闭环：新增 `/api/admin/taoyuan/realtime`，管理端可只读查看当前 WebSocket 连接数、在线账号 / 存档数、连接身份摘要、连接时长和最近客户端活动时间。
- 离线实时通知队列现在也有管理端安全摘要，返回待补发总数、按玩家聚合的 pending 数、最近入队时间、事件类型分布、队列状态和队列上限；接口不返回通知 payload 正文，也不会触发 ACK、补发或结算。
- `qa:online-smoke` 已补管理端 realtime 读路径断言，覆盖连接统计、补发队列摘要、类型计数、队列状态和 payload 不泄露边界；本轮验证通过 `node --check server/src/taoyuanRealtimeRuntime.js`、`node --check server/src/routes/api.js`、`node --check server/scripts/qa-online-smoke.mjs`、`git diff --check` 与 `npm --prefix server run qa:online-smoke`。

- `0520todo.md / C4-C5` 这一轮把节会房间接进服务端回合事件系统：守岁、灯会、赛舟、七夕、中秋和腊八模板现在会按房型生成当前事件、场面压力、队伍资源、职责分工、回合动作和回合日志。
- 节会动作已带上 `required_role / once_per_round / pressure_delta / resource_delta / combo_tags / round_effect`，动作会由服务端 runtime 更新共享回合状态；职责在节会里先作为协作提示，不阻断旧的结算和管理端补偿场景。
- `FestivalView.vue` 新增节会事件卡、我的职责、队伍资源、回合记录和动作效果展示；本轮验证通过 `node --check server/src/taoyuanActivityRoomRuntime.js`、`node --check server/scripts/qa-online-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`git diff --check` 与 `npm --prefix server run qa:online-smoke`。

- `0520todo.md / C0-C3` 这一轮先把 `expedition_cavern` 做成联机小游戏样板间：后端快照新增回合号、当前事件、风险、队伍资源、角色分工、回合日志和最近反馈。
- 矿洞动作已带上 `required_role / once_per_round / risk_delta / resource_delta / combo_tags / round_effect`，并会根据当前事件触发组合收益；其它远征和节会模板仍保持旧的共享进度动作逻辑。
- `ExpeditionRoomView.vue` 在矿洞样板间下新增事件卡、队伍资源板、职责提示、动作效果和回合日志；本轮验证通过 `node --check server/src/taoyuanActivityRoomRuntime.js`、`node --check server/scripts/qa-online-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`git diff --check` 与 `npm --prefix server run qa:online-smoke`。

- `0520todo.md / B3` 这一轮收口 `AdminOnlineGovernancePanel.vue` 的联机发布配置表单：beta template 输入区从中宽 `md:3列` 改成 `md:2列 / xl:3列`，避免管理端中等屏宽硬挤三列。
- 管理端白名单 textarea、beta template 输入框和 release notes textarea 已迁到 `online-textarea / online-input`；发布说明的 5 个 textarea 默认高度从 3 行提升到 5 行，和玩家端统一表单高度保持同级。
- 本轮只改管理端发布配置 UI class 和布局，不改联机发布配置保存、灰度开关、模块开关或事故预案逻辑；已通过 `npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build` 与 `git diff --check`。

- `0520todo.md / B2` 这一轮收口 `ManorView.vue` 的庄园主题名保存操作行：主题名输入框和保存按钮已迁到统一 `online-action-row + online-input + online-action-btn`。
- 这一行现在和其他联机表单一样会在窄屏自动换行；本轮只改 UI class，不改庄园主题周、导览或来访记录逻辑。
- 本轮已通过 `npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build` 与 `git diff --check`。

- `0520todo.md / B2` 这一轮收口 `QuestView.vue` 的在线求助单创建区：标题、类别、可见范围、协作模式、截止时间、回报类型、回报数值、回报说明和多段接力阶段草稿输入都迁到统一 `online-*` 表单类。
- 求助内容与阶段说明 textarea 已改用 `online-textarea`，发布 / 新增阶段 / 删除阶段按钮也换成统一按钮类；本轮只改创建草稿 UI，不改求助单发布、接单、交付、确认或补偿逻辑。
- 本轮已通过 `npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build` 与 `git diff --check`。

- `0520todo.md / B1` 这一轮收口 `SocietyView.vue` 的村社邀请与会议表单：邀请玩家输入行、提案标题、提案类型、提案摘要、发起按钮、归档备注和归档按钮都迁到统一 `online-*` 表单 / 按钮类。
- 村社邀请行现在使用 `online-action-row`，窄屏会按统一规则换行；本轮只换 UI class，不改村社邀请、申请处理、提案发起、投票或归档逻辑。
- 本轮已通过 `npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build` 与 `git diff --check`。

- `0520todo.md / B1` 这一轮收口 `FestivalView.vue` 的节会房间创建和邀请表单：节会房型、玩法模板、房间标题、创建按钮，以及邀请玩家输入行都迁到统一 `online-*` 表单 / 按钮类。
- 节会邀请行现在和远征房间一样使用 `online-action-row`，窄屏会自动换行；本轮只换 UI class，不改节会房间创建、邀请、ready、玩法动作、结算或关闭逻辑。
- 本轮已通过 `npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build` 与 `git diff --check`。

- `0520todo.md / B1` 这一轮收口 `ExpeditionRoomView.vue` 的远征房间创建和邀请表单：远征模板、玩法模板、房间标题、创建按钮，以及邀请玩家输入行都迁到统一 `online-*` 表单 / 按钮类。
- 邀请玩家行现在使用 `online-action-row`，窄屏会按统一规则自动换行；本轮只换 UI class，不改远征房间创建、邀请、ready、结算或关闭逻辑。
- 本轮已通过 `npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build` 与 `git diff --check`。

- `0520todo.md / B1-B2` 这一轮收口 `SocialView.vue` 的公开名片与邻里高频表单：名片设置里的庄园名、公开称号、邻里身份、展示主题、头像说明、公开状态和公开介绍已迁到 `online-input / online-select / online-textarea`。
- 邻里邀请行改用 `online-action-row + online-input`，窄屏会按统一规则换行；创建邻里的名称、简介、初始公告、容量选择和邀请 / 创建按钮也改用统一联机表单与按钮类。
- 本轮不改邻里申请、成员、订阅和公开名片业务逻辑；已通过 `npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build` 与 `git diff --check`。

- `0520todo.md / B1` 这一轮把 `RegionMapView.vue` 好友驿站里剩余的 32px 紧凑按钮统一收口到 `online-action-btn--compact`：刷新、复制 ID、搜索结果申请 / 拉黑、收到申请接受 / 拒绝、好友条目里的庄园 / 写信 / 送礼 / 邀请进房 / 节会 / 村社 / 协作，以及删除 / 拉黑 / 解除拉黑都改用同一套按钮类。
- 危险动作继续叠加 `online-action-btn--danger`，原有禁用条件、`data-testid` 和点击事件保持不变；这一轮只替换样式层，不改好友关系和跳转业务逻辑。
- 本轮已通过 `npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build` 与 `git diff --check`。

- `0520todo.md / A5-A7` 这一轮把导入档身份回写加入真实浏览器回归：`qa:online-regression-live-smoke` 现在会通过主菜单把不含 `onlineIdentity` 的导入档写入服务端空槽，验证服务端 raw 已写回公开存档 ID。
- 这条回归还会用 `player-search` 按新 ID 搜索对应槽位，并在载入导入槽后进入行旅图好友驿站，确认浏览器界面显示的存档 ID 与服务端补发 ID 一致。
- 回归脚本同时过滤页面关闭阶段的 `gameplay/logs/batch` abort 噪声，避免测试在功能通过后因日志上报被取消而假红；本轮已通过 `node --check taoyuan-main/scripts/qa-online-regression-live-smoke.mjs` 与 `npm --prefix taoyuan-main run qa:online-regression-live-smoke`。

- `0520todo.md / A5` 这一轮补上旧档兼容的前端提示：主菜单持久化模式卡片和存档管理器现在会说明本地 / 导入档在切到服务端保存后才会获得公开存档 ID，也会在已有服务端身份时直接展示当前 ID。
- 导入成功提示会按当前存储模式区分本地导入、服务端导入和离线排队补传，避免玩家误以为纯本地档已经能被好友搜索；公开数字 ID 仍只由服务端保存 / 导入写回。
- 本轮已通过 `npm --prefix taoyuan-main run type-check` 与 `npm --prefix taoyuan-main run build`；构建仍只有既有大 chunk 警告。

- `0520todo.md / A5` 这一轮补上服务端存档身份回写闭环：`POST /api/taoyuan/save/:slot` 现在会返回注入 `onlineIdentity` 后的权威 raw，前端服务端同步成功后会从该 raw 刷新当前运行时 `currentOnlineIdentity`。
- 这让本地档 / 导入档切到服务端可写槽位保存后，无需重新读档也能拿到服务端补发的固定数字 ID；服务端仍是 ID 分配与防篡改权威，客户端只消费保存响应，不自行生成公开 ID。
- `qa:online-smoke` 已补断言，验证服务端保存响应包含嵌入的存档身份；本轮已通过 `node --check server/src/routes/api.js`、`node --check server/scripts/qa-online-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix server run qa:online-smoke` 与 `npm --prefix taoyuan-main run build`。

- `0520todo.md / A5` 这一轮补齐村社公告实时通知：`POST /api/taoyuan/online/societies/notice` 成功后，服务端会向同村社其他成员投递 `notification.created`，使用 `category: "society"`、`action: "notice_updated"` 和 `refresh_required: true`。
- 村社通知继续保持 delivery-only：成员、职位权限与公告写入仍由 `taoyuanSocietyRuntime` 和 HTTP 路由权威处理，WebSocket 只做摘要投递与前端静默重读，不参与最终结算。
- `useRealtimeStore.ts` 新增 `society` 通知分支，收到后静默刷新村社概览；`useSocietyStore` 也补了 `silent` 刷新模式，避免 realtime 回读时抖动页面状态。
- `qa:realtime-smoke` 新增在线/离线村社公告通知回归，已验证 ACK 清理和重连不重复补发。本轮已通过 `node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix taoyuan-main run type-check` 与 `npm --prefix server run qa:realtime-smoke`。

## 2026-05-20（开发中）

- `0520todo.md / A5` 这一轮把大厅官方公告帖纳入实时通知补发：管理员发布 `is_official` 帖，或使用 `event_announcement / showcase_wrapup` 官方模板发帖成功后，服务端会向现有账号投递 `notification.created`，使用 `category: "hall"` 与 `action: "official_announcement"`。
- 大厅官方公告通知继续保持 delivery-only：发帖、官方权限校验、帖子落库和后续展示仍由 `taoyuanHall` 与 HTTP 路由权威处理，WebSocket 只投递帖子摘要、`refresh_required` 和大厅分类，前端复用现有大厅实时监听静默重读帖子列表 / 当前详情。
- `qa:realtime-smoke` 新增在线大厅官方公告通知，以及离线大厅官方公告补发 / ACK / 重连不重复补发断言。
- 本轮验证已通过 `node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs`、`npm --prefix server run qa:realtime-smoke` 与 `npm --prefix server run qa:online-smoke`。
- `0520todo.md / A5` 这一轮把定时 campaign 到期发送也纳入邮箱实时通知：`processPendingCampaigns()` 现在会返回本次新增 delivery 摘要，邮箱列表 / 详情 / 领取 / 后台邮件列表等触发到期处理的路由会投递 `notification.created`，使用 `category: "mail"` 与 `action: "scheduled_campaign"`。
- 这条链路仍保持 delivery-only：定时 campaign 的收件人解析、落库、状态切换和奖励领取逻辑继续由 `taoyuanMailbox` 权威处理，WebSocket 只在保存后投递新增邮件摘要；路由层先统一处理 pending campaign，再让领取 / 后台保存逻辑跳过内部重复处理，避免“内部触发但没通知”的分叉。
- `qa:realtime-smoke` 新增离线定时后台邮件补发回归：创建未来 3 秒的定时 campaign，到期后由后台列表触发发送，验证收件人离线时会补发 `scheduled_campaign`、ACK 后清理且重连不重复。
- 本轮验证已通过 `node --check server/src/taoyuanMailbox.js`、`node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs` 与 `npm --prefix server run qa:realtime-smoke`。
- `0520todo.md / A5` 这一轮继续补齐邮箱通知面：自助系统邮件 `POST /api/taoyuan/mail/system-campaign` 与后台即时发送 `POST /api/admin/taoyuan/mail/campaigns?action=send` 在邮件投递落库成功后，会按实际新增的 delivery 向收件人投递 `notification.created`，分别使用 `action: "system_campaign"` 与 `action: "admin_campaign"`。
- 系统 / 后台邮件通知继续复用邮箱 `category: "mail"` 与 `refresh_required` 摘要 payload，前端无需新增分支，仍只触发邮箱权威接口静默刷新；路由层会先记录保存前已有 delivery id，再只对本次新增邮件投递通知，避免自助系统邮件同 id 幂等返回时重复推送。
- `qa:realtime-smoke` 新增在线系统邮件通知、在线后台即时邮件通知，以及离线后台即时邮件补发 / ACK / 不重复补发断言；定时 campaign 到期发送的实时通知已在后续轮次补齐。
- 本轮验证已通过 `node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs` 与 `npm --prefix server run qa:realtime-smoke`。
- `0520todo.md / A5` 这一轮把大厅回复纳入 `notification.created`：`POST /api/taoyuan/hall/posts/:id/replies` 在 HTTP 权威写入成功后，会向帖子作者和被引用回复作者投递 `category: "hall" / action: "post_reply"`，排除操作者并去重；payload 只带帖子和回复摘要，不让 WebSocket 参与回复写入或奖励结算。
- 大厅回复通知继续复用服务端离线补发队列；目标玩家离线时会随 `queued_event_id / replayed / queued_at` 补发，前端收到后 ACK 清理。`HallView.vue` 现在会在顶层 `/hall` 路由自行启动 realtime store，收到大厅通知后只静默重读帖子列表和当前详情。
- `qa:realtime-smoke` 新增在线大厅回复通知与离线大厅回复补发 / ACK / 不重复补发断言；`qa:online-regression-live-smoke` 新增真实浏览器场景：玩家停在大厅帖子详情页时，另一个账号回复后无需手动刷新即可看到新回复。
- 本轮验证已通过 `node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs`、`node --check taoyuan-main/scripts/qa-online-regression-live-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`npm --prefix server run qa:realtime-smoke`、`npm --prefix taoyuan-main run qa:online-regression-live-smoke` 与 `git diff --check`；构建仍只有既有大 chunk 警告。
- `0520todo.md / A5` 这一轮把玩家来信 / 礼物包裹纳入实时通知补发：`/api/taoyuan/mail/player-letter` 与 `/api/taoyuan/mail/player-gift-package` 在 HTTP 权威写入成功后，会向收件人投递 `notification.created`，payload 只带邮件摘要、`category: "mail"` 与 `refresh_required`，不把邮件详情或奖励结算交给 WebSocket。
- `notification.created` 已加入服务端离线补发队列；目标玩家离线时会随 `queued_event_id / replayed / queued_at` 补发，前端收到后继续走通用 `notification.ack` 清理队列。`useRealtimeStore.ts` 只在 `category === "mail"` 时防抖调用 `useMailboxStore().refreshList({ silent: true })`，邮箱列表读 HTTP 权威接口，不直接套用实时 payload。
- `qa:realtime-smoke` 新增在线来信通知与离线来信补发 / ACK / 不重复补发断言；`qa:online-regression-live-smoke` 新增真实浏览器场景：收件人停在邮箱页，另一个账号发来信后，不点击“刷新邮件”也能靠 realtime 刷出新邮件。
- 本轮验证已通过 `node --check server/src/taoyuanRealtimeRuntime.js`、`node --check server/src/routes/api.js`、`node --check server/scripts/qa-realtime-smoke.mjs`、`node --check taoyuan-main/scripts/qa-online-regression-live-smoke.mjs`、`npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`npm --prefix server run qa:realtime-smoke`、`npm --prefix taoyuan-main run qa:online-regression-live-smoke` 与 `git diff --check`；构建仍只有既有大 chunk 警告。
- `0520todo.md / B0-B1` 这一轮先在 `taoyuan-main/src/app.css` 补 `online-action-btn--compact / online-action-buttons--compact` 紧凑修饰符（32px 高、10px 字体），并把 `RegionMapView.vue` 好友驿站"存档 ID 搜索"行的 `<input>` 迁移到 `online-input`、搜索按钮迁移到 `online-action-btn online-action-btn--primary online-action-btn--icon`，与新统一类的 42px 高度对齐。
- 本轮只迁移最高频的搜索入口，保留 wrapper `flex gap-2` 与 `flex-1 min-w-0`，移动端紧凑横向布局未受影响；好友驿站内 32px 紧凑操作按钮（接受 / 拒绝 / 删除 / 拉黑 / 庄园 / 写信 / 送礼 / 邀请进房 / 节会 / 村社 / 协作 / 解除拉黑等）和搜索结果上的申请 / 拉黑按钮暂不迁移，待下一轮基于 `online-action-btn--compact` 批量收口。
- 新增 `qa:online-regression-live-smoke` 浏览器回归脚本：真实后端 + Vite + Chromium 下会载入服务端存档、建立 realtime WebSocket、执行一次服务端快速保存、领取后台奖励邮件并确认服务端存档金钱入账，再发布大厅帖子和回复，覆盖云存档 / 邮箱 / 大厅这些 A7 旧入口不被这轮 UI 与 realtime 变更破坏。
- 本轮验证已通过 `npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run build`、`node --check taoyuan-main/scripts/qa-online-regression-live-smoke.mjs` 与 `npm --prefix taoyuan-main run qa:online-regression-live-smoke`；构建仍只有既有大 chunk 警告。
- `0520todo.md / B0` 这一轮先把联机表单的统一样式口径落到 `taoyuan-main/src/app.css`：新增 `online-field / online-field-label / online-field-hint / online-field-error / online-input / online-select / online-textarea / online-action-row / online-action-buttons / online-action-btn` 等基础类，沿用现有 `--color-accent / --color-bg / --color-panel / --color-text / --color-muted / --color-danger / --font-game` 设计 token，不引入新 UI 库或新主题色。
- 高频输入框统一锁定 42px 最小高度并与 `.online-action-btn` 对齐，`.online-textarea` 默认 96px、允许垂直 resize；≥768px 桌面端 `.online-input / .online-select / .online-textarea` 至少 240px 宽，避免被三列联机面板压扁；≤639px 移动端 `.online-action-row` 自动改为纵向、`.online-action-buttons` 内按钮 100% 铺满，保留键盘 / 触控可达性。
- 本轮仅追加样式 token，不替换任何联机页面现有结构与业务逻辑；样式与首个搜索入口已随 `type-check`、`build` 和真实在线回归 smoke 一起验证，后续 B1 会继续逐步迁移更多高频入口。
- `0520todo.md / A4` 这一轮按原生 WebSocket 方案补出服务端实时通讯底座：`/api/taoyuan/online/realtime` 现在会复用签名 `taoyuan.sid` 与文件会话存储完成鉴权，建立连接后下发 `realtime.ready`，并由服务端内存连接表维护当前账号 / 活动存档的在线状态。
- 实时通道当前只做事件投递，不参与跨玩家结算：客户端可发送 `ping` 与 `presence.snapshot` 这类轻消息，好友申请、接受、拒绝和删除仍然全部走 HTTP 服务端权威写路，写入成功后再向双方推送 `friend.request.*` 或 `friend.removed`。
- 新增 `server/scripts/qa-realtime-smoke.mjs` 与 `qa:realtime-smoke`：烟测会启动隔离后端、注册两名临时玩家、写入服务端存档、用原始 TCP WebSocket 握手验证未登录拒绝、已登录 ready、在线 / 离线 presence、好友申请推送和接受推送，覆盖这一轮 A4 服务端闭环。
- `0520todo.md / A4-A5` 这一轮把前端最小实时消费层接上：新增 `useRealtimeStore.ts`，游戏布局进入后会按当前登录会话建立原生 WebSocket、发送轻量 ping、断线后退避重连，并在 `realtime.ready` 后拉取 presence snapshot 与静默刷新好友关系。
- 好友驿站现在可以被实时事件推动刷新：收到 `friend.request.created / accepted / rejected / removed` 后，前端只重新读取服务端权威关系概览，不直接改好友状态或结算结果；Vite 开发 / 预览代理也补了 `ws: true`，保证本地浏览器烟测能走同一条 `/api/taoyuan/online/realtime`。
- `qa:region-friend-panel-live-smoke` 已扩展 realtime 断言：真实后端 + Vite + Chromium 环境下会确认游戏布局打开 WebSocket，并由另一个临时账号发起好友申请，验证页面不点击刷新也能看到新申请。
- `0520todo.md / A4` 这一轮补齐活动房间实时投递：节会 / 远征房间在建房、邀请、加入、离开、准备、倒计时、断线、重连、动作、结算和关闭这些 HTTP 权威写路成功后，会向相关成员推送 `activity.room.invited` 或 `activity.room.updated`；事件 payload 带 `refresh_required`，明确只提示客户端刷新服务端权威状态，不让 WebSocket 参与跨玩家结算。
- `qa:realtime-smoke` 已新增远征房间实时回归：隔离后端下会创建房间、邀请好友并让好友加入，分别断言房主和被邀请者能收到建房、邀请和加入状态变化事件；同时复跑 `qa:online-smoke` 确认节会 / 远征原有结算、治理和发布开关链路没有被实时投递破坏。
- `0520todo.md / A4-A5` 这一轮把前端活动房间实时消费接上：`useRealtimeStore.ts` 现在会消费 `activity.room.invited / activity.room.updated`，按事件 `domain` 对节会 / 远征房间概览做防抖静默刷新，继续只读取 HTTP 权威接口，不把 WebSocket payload 当作结算结果。
- 节会与远征房间 store 新增 silent refresh 模式，实时刷新时不会打断页面 loading / 错误状态；远征邀请列表也补入稳定 `data-testid`，供浏览器烟测确认邀请卡片自动出现。
- `qa:region-friend-panel-live-smoke` 已扩展活动房间实时回归：真实后端 + Vite + Chromium 下会由另一个临时账号创建远征房间并邀请当前浏览器账号，断言收到 `activity.room.invited` 帧后页面无需手动刷新即可显示对应邀请；本轮复核通过 `type-check`、`build`、该浏览器 smoke 与 `git diff --check`。
- `0520todo.md / A5` 这一轮补出实时通知离线补发队列：好友事件和活动房间事件如果投递时目标玩家不在线，会持久写入 `taoyuan_realtime_notifications.json`，下次 WebSocket ready 后原事件类型补发，并带 `queued_event_id / replayed / queued_at` 元数据。
- 前端 realtime store 现在会对带 `queued_event_id` 的补发帧发送 `notification.ack`，服务端收到 ACK 后清理对应队列项；这条链路只重放投递事件，不执行好友或房间结算，继续保持 WebSocket delivery-only。
- `qa:realtime-smoke` 已新增离线好友申请补发回归：隔离后端下会在目标账号未连接时发起好友申请，随后连接目标账号验证 pending 数、补发帧和 ACK 清理，再次连接确认不会重复补发；本轮同时复跑 `type-check`、`build`、`qa:region-friend-panel-live-smoke` 与 `qa:online-smoke`。
- `0520todo.md / A6` 这一轮继续补齐地图页好友入口嵌入：好友卡片新增节会与村社邀请按钮，会沿用同一套好友 `username / save_id` 目标上下文跳转到对应页面，并带上 `invite=1` 标记。
- 节会与村社页面现在会读取路由里的 `target_username` 并预填邀请输入框，只替玩家填好目标，不自动提交邀请；庄园、邮箱、远征和协作单的既有好友上下文入口保持不变。
- `qa:region-friend-panel-live-smoke` 已扩展真实后端浏览器回归：烟测会先为当前账号创建节会房间和村社，再从地图好友卡点击节会 / 村社入口，断言 URL 带目标好友上下文且邀请输入框已预填目标用户名；本轮复核通过 `node --check`、`type-check`、`build`、该浏览器 smoke 与 `git diff --check`。
- `0520todo.md / A5-A7` 这一轮把浏览器级断线重连回归补上：`qa:region-friend-panel-live-smoke` 会在真实游戏页主动关闭当前 realtime WebSocket，等待前端自动重连后断言新的 `realtime.ready`、`presence.snapshot` 帧，并验证断线窗口内产生的好友申请会刷新到好友驿站。

- `0520todo.md / A0` 这一轮先把服务端存档身份底座落到真实读写链路：`server/src/taoyuanSaveRuntime.js` 新增按账号 + 槽位维护的 `SaveIdentity` 注册表，服务端存档读回与保存时会自动注入 9 位数字 `onlineIdentity.save_id`，并且覆盖客户端篡改的 ID，只允许昵称快照随存档内容更新。
- 旧服务端存档现在第一次经 `/api/taoyuan/save/slots` 或 `/api/taoyuan/save/:slot` 读回时会自动补发数字 ID 并回写到加密存档；删除服务端槽位时也会清理对应身份记录，避免空槽后续误复用旧身份。
- `server/scripts/qa-online-smoke.mjs` 已补进 A0 回归：当前会实际验证旧档读回补发 `onlineIdentity`，以及客户端尝试用不同 `save_id / account_username / save_slot` 覆盖时，服务端仍保留原固定数字 ID。
- `0520todo.md / A2` 这一轮补出按存档数字 ID 搜索玩家的服务端最小链路：新增 `/api/taoyuan/online/social/player-search?save_id=...`，会从 `SaveIdentity` 注册表定位到对应账号与槽位，再按该槽位构建公开名片，搜索结果不下发背包、钱包等存档内容。
- 在线 smoke 同步加入 `GET /api/taoyuan/online/social/player-search save id path`，确认新搜索接口能读回正确 `save_id / save_slot / profile.username`，并断言不会泄露 gameplay payload。
- 好友申请链路这轮也开始承接存档级身份：`/api/taoyuan/online/social/friend-requests` 现在支持 `target_save_id`，服务端会解析目标存档身份并在申请记录里保留 `from_save_id / to_save_id / from_save_slot / to_save_slot`，同时继续兼容旧的 `target_username` 入参。
- 在线 smoke 已把好友申请 setup 改成按目标存档 ID 发起，并继续跑过接受申请、好友范围协作单和好友纪念册筛选，确认新入口没有破坏旧的好友关系消费链路。
- `0520todo.md / A1-A2` 这一轮继续把好友图谱往存档级推进：接受好友申请时，`friendships` 现在会写入双方 `save_id / save_slot`，旧的 username 关系仍可被识别并在接受新申请时逐步补成存档级关系，避免立刻切断邮箱、委托等旧消费链路。
- `/api/taoyuan/online/social/relationships` 现在会在申请列表与好友列表里回显 `from_save_id / to_save_id / own_save_id / friend_save_id` 等身份字段，并优先按当前活动存档过滤存档级申请与好友，同时继续兼容旧 username 关系。
- 在线 smoke 新增关系总览回归：申请发出后会检查双方 overview 里的申请存档 ID，接受后会检查双方好友列表里的 `own_save_id / friend_save_id / friend_save_slot`，确认好友列表已能稳定承接存档级身份。
- 删除好友也接入了服务端最小闭环：新增 `DELETE /api/taoyuan/online/social/friends/:friendshipId`，会校验当前玩家是否拥有该 username / 存档级关系，存档级关系必须有当前活动存档才能删除；删除后好友列表和好友范围委托可见性会立即随关系变化。
- 在线 smoke 已补入删除好友回归：在好友范围委托、好友纪念册与节会好友队友名单验证之后，删除同一条 `friendship_id`，再确认双方好友列表不再出现该关系，且对方不再能看到这条好友范围委托。
- 拉黑 / 解除拉黑也开始承接存档级身份：`/api/taoyuan/online/social/blocks` 与 `/api/taoyuan/online/social/blocks/unblock` 现在支持 `target_save_id`，会记录 `blocker_save_id / blocked_save_id / save_slot`，关系列表也会按当前活动存档过滤并回显拉黑对象的存档身份。
- 在线 smoke 已补入拉黑回归：新增独立存档身份测试账号，按 `target_save_id` 拉黑后确认关系列表回显 `blocked_save_id`，好友申请会被拉黑关系拦截；解除拉黑后再确认拉黑列表移除并可重新发起存档级好友申请。
- `0520todo.md / A3` 这一轮把好友主操作接进地图页：`RegionMapView.vue` 新增“好友驿站”面板，包含我的存档 ID / 复制、按 ID 搜索玩家、发送申请、处理收到申请、好友列表、最近互动、删除好友、拉黑和解除拉黑入口。
- 前端社交 API 与 store 也同步补齐：`onlineProfileApi.ts` 新增按存档 ID 搜索玩家和删除好友 helper，`useSocialStore.ts` 新增搜索结果、存档 ID 申请、存档 ID 拉黑 / 解除拉黑、删除好友动作；`useSaveStore.ts` 会在读档时保留服务端注入的 `onlineIdentity`，供地图页展示当前存档 ID。
- 地图页好友驿站当前已补齐好友条目的庄园、写信、送礼、邀请进房和协作五类互动入口，并把目标玩家 `username / save_id` 带到下游页面：庄园会读取目标玩家公开快照，邮箱会预填书信或礼物包裹收件人，远征房间会预填邀请对象，委托页会切到好友范围并写入目标上下文。
- 好友驿站移动端真实截图冒烟也同步扩展：好友申请处理、好友互动和解除拉黑按钮已补齐触控高度，`qa:mobile-ui-smoke` 新增 390x844 / 360x780 好友面板场景，覆盖存档 ID 搜索、申请入口、好友条目、送礼 / 邀请进房入口、最近互动、拉黑列表、按钮尺寸和无横向溢出；真实 Chromium 验证已通过并生成 `docs/ui-smoke-2026-04-26/22-region-social-friend-panel-mobile-390x844.png` 与 `23-region-social-friend-panel-mobile-360x780.png`。
- `0520todo.md / A3-A7` 这一轮把好友主操作迁移收口继续往前推了一步：`SocialView.vue` 已移除旧的用户名加好友、拉黑、申请处理、好友列表和解除拉黑主操作，只保留公开名片、邻里与订阅等社会层内容，并提供“好友驿站”跳转到行旅图。
- `RegionMapView.vue` 好友驿站补入真实浏览器烟测所需的稳定 `data-testid`，覆盖按存档 ID 搜索、申请、拉黑、申请接受 / 拒绝、好友条目互动跳转、删除 / 拉黑好友和解除拉黑等按钮，不改变玩家侧文案与业务链路。
- 新增 `taoyuan-main/scripts/qa-region-friend-panel-live-smoke.mjs` 与 `qa:region-friend-panel-live-smoke` 脚本：烟测会启动隔离 JSON 数据库、真实后端和 Vite，用 Playwright 注册临时账号、写入服务端存档、构造申请 / 好友 / 拉黑关系，再逐个点击前端好友驿站按钮并校验后端关系状态。
- 好友驿站真实后端烟测已覆盖 8 条关键路径：好友互动跳转携带目标上下文、按存档 ID 搜索并发申请、接受申请、拒绝申请、删除好友、拉黑现有好友、搜索后拉黑、解除拉黑；本轮复核还通过了 `type-check`、`build` 与 `git diff --check`。

- `L130-L134` 这一轮把联机发布控制收成了第一轮可回归闭环：`server/src/config.js` 现已补齐联机总开关、`stable / canary` 通道、测试白名单、好友 / 庄园 / 求助单 / 节会四类能力开关、五大模块开关、内测庄园 / 村社 / 节会样板，以及五段发布说明字段；`/api/public-config` 也开始稳定下发 `taoyuan_online_release` 摘要，不再只有后台私有配置。
- `server/src/routes/api.js` 这一轮已把联机发布配置真正接进服务端治理链：新增 `/api/admin/taoyuan/online-release-config` 读写接口、联机发布配置归一化、灰度白名单与模块级 guard，并把庄园、求助单、好友链路和节会房间路由接到统一 `createOnlineReleaseGuard()`，默认仍保持 `stable + 全开`，不主动影响现有玩家。
- 联机发布配置这轮还补了一处关键兼容修复：后台保存时，服务端现在会正确接住嵌套的 `featureFlags / moduleSwitches / betaTemplates / releaseNotes` 结构，不再出现“前端面板能改、服务端实际没保存”的假开关状态。
- `server/scripts/qa-online-smoke.mjs` 已补进 `L13` 回归：当前会实际验证 `/api/public-config` 的联机发布摘要、后台联机发布配置读写，以及临时关闭 `festival` 模块后 `GET /api/taoyuan/online/festival/rooms` 返回 `503` 的真实拦截，再恢复原配置，保证灰度与单独关闭不只是代码存在。
- `L140-L154` 这一轮按保守方案收成了“扩展模板 + 版本整理”骨架：新增 `docs/online/10-release-and-expansion.md`，把新庄园主题、新节庆、新房间玩法、新村社工程、新委托类型和新纪念品六类接入模板，以及玩法 / 经济 / 视觉三组扩展位、当前灰度开关、风险、已知问题和最终验收口径统一文档化。
- `taoyuan-main/src/components/game/AdminOnlineGovernancePanel.vue` 现在也同步承接 `L14-L15`：后台联机治理页已新增“联机扩展模板”和“联机版本整理”区块，可直接查看新内容挂点、扩展位约束、当前已落地联机主线、待补项、风险、阶段检查点与最终验收口径，不再只停在 TODO 文档里。
- `0518todo.md` 这一轮已全部勾完，`0518联机plan.md` 与 `docs/online/README.md` 也同步回写到新的 `10-release-and-expansion.md` 落点；本轮之后，联机宇宙这份执行 TODO 的第一轮收口可以视为完成。

- `L120-L127` 这一轮把联机入口层和页面显式收口补齐了：主菜单现在新增“联机世界”区块，可直接带入最近存档跳到好友来访、邻里动态、今日节会、村社公告和热门庄园；游戏内移动地图也新增独立“联机主导航”，把 `邻里 / 庄园 / 委托 / 节会 / 村社` 统一收在同一层入口。
- 这轮继续走保守 UI 收口，不改玩法逻辑：旧存档若缺角色身份，会在补录名字 / 性别后继续回到用户刚才点的联机目标面板；没有可带入存档时则明确提示先开启旅程，不去伪造一条空的联机链路。
- `庄园 / 邻里 / 委托 / 节会 / 村社` 五大面板的 L12 显式区块这轮也一并收口：庄园页补出委托直达入口，邻里页把任务 / 进度 / 排行从隐含状态提升成单独区块，委托页标题明确统一到联机语义；节会与村社页则沿用现有房间、奖励、公告、会议、投票、公共建设和史册面板完成第一轮 L12 验收。

- `L113-L115` 这一轮把联机治理与事故处理收成了第一轮可回归闭环：当前已补齐管理员侧委托补偿重放、活动房间结算重放、未接单未交付委托回滚、误封恢复，以及 `/api/admin/taoyuan/overview / players / societies / manors / orders / festival / hall/overview / audit-logs` 这组统一治理读链。
- 这轮治理工具继续走保守口径：委托回滚只允许 `open + 未接单 + 未交付` 的求助单，活动结算重放只允许处理仍停在 `settling` 的房间，委托补偿重放只处理 `pending` 记录，不去反推已经正常完成的联机结算。
- `server/scripts/qa-online-smoke.mjs` 已补进 `L113-L115` 真实事故样本：当前会实际构造“无服务端存档导致奖励写回失败”的委托与节会场景，再通过管理员补存档、重放补偿、重试关房、回滚委托与误封恢复，把治理链跑到可重复回归状态。

- `L112` 这一轮把联机图片与装饰审核补成了第一轮可回归闭环：新增 `server/src/taoyuanImageModeration.js`，统一承接大厅插图、书信附图、名片头像、庄园主图和后台配图五类图片资产的用途分桶、大小限制、登记、隐藏状态、举报记录与上传黑名单，不再只让大厅帖子自己散着管图片。
- 图片上传当前已经真正接到服务端用途规则：大厅帖图、头像和庄园主图都复用现有 `/api/taoyuan/hall/upload-image`，但会按 `hall_post / profile_avatar / manor_cover` 各自执行大小上限与黑名单校验，命中限制时直接拒绝，不改变原有玩法逻辑。
- 图片公开读取现在也跟审核状态对齐：名片头像、庄园主图和大厅帖子详情都会读取图片可见性；被管理员隐藏后，静态层返回 404，公开档案 / 庄园快照会自动清空该图，大厅帖子详情则会显示“已被管理员隐藏”的占位说明。
- 管理端第一轮图片处理入口已经接通：管理员现在可以读取图片举报列表、最近上传图片资产和图片黑名单，并执行标记处理、隐藏举报图片、直接隐藏图片资产、封禁上传者和解除限制；头像与庄园主图这类不在帖子里的图片，也已经能通过图片资产面板直接处置。
- 在线 smoke 已补进 `L112` 回归：当前会实际验证图片上传、图片帖发帖、图片举报、管理员读取图片举报列表、隐藏图片、图片黑名单和黑名单后再次上传拦截，第一轮图片审核链已具备可重复回归能力。

- `L111` 这一轮把联机文本审核补成了第一轮可回归闭环：当前已新增 `server/src/taoyuanTextModeration.js`，统一承接禁词、疑似引流词、长度和换行约束，不再让注册命名、庄园留言、玩家书信、求助单和村社公告各自散着做字符串裁剪。
- 玩家名与公开资料当前已经开始走同一套审核口径：注册时会审核 `username + display_name`，公开档案更新时会审核 `public_intro / manor_name / public_title / neighborhood_role / showcase_theme`，命中禁词时会直接拒绝，不再只校验格式或长度。
- 联机互动文本这轮也补齐了关键写路：庄园留言 / 回复、玩家书信 / 礼物包裹附言、求助单标题 / 内容 / 多段阶段标题、村社公告与提案摘要现在都会在服务端统一审核后再入库，先把最容易外显的文本面收住。
- 在线 smoke 已补进 `L111` 拒绝类回归：当前会实际验证注册命名、庄园留言、玩家书信、公开档案庄园名、求助单标题和村社公告的审核拒绝，并确认审核失败不会覆盖已有合法资料。

- `L110` 这一轮把联机反作弊底座补成了第一轮可回归闭环：现有协作委托、节会 / 远征房间、慢交易、邮件奖励和世界事件继续保持服务端结算、服务端落账与既有幂等保护，不改玩法逻辑，只在路由层补统一限流和在线审计。
- 当前高风险联机写路已经统一接入保守限流：房间动作、求助单、世界事件、村社治理、慢交易、玩家邮件和交流大厅写路超过阈值时会返回 `429 / ONLINE_RATE_LIMITED`，先把最常见的高频刷写入口收住。
- 新增 `server/src/taoyuanOnlineAudit.js` 与 `/api/admin/taoyuan/online-audit`：现在会持续记录关键在线写操作、限流命中和结果状态，管理员已经可以读取联机事件流水，不再只有后台管理员操作审计。
- 在线 smoke 也已补进 `L110` 回归：当前会实际验证统一限流命中，以及在线审计日志能读到订单、邮件、集市、交流大厅和限流命中等关键记录。

## 2026-05-19（开发中）

- `L104` 这一轮把玩家史册、村社史册、荣誉系统和纪念层一起收成了第一轮验收闭环：当前 `/api/taoyuan/online/profile` 不只会返回 `player_chronicle`，还会继续返回 `award_showcase`，把荣誉、纪念品、称号和成就卡统一沉成一份可回看的公开档案扩展。
- `L103` 这一轮把纪念品与称号正式接进公开档案了：节庆纪念品、村社徽章、世界纪年章、限定称号和可展示成就卡都会直接从现有节会纪念册、村社共建痕迹、世界事件徽记和玩家史册里自动回填，不再只停留在文档描述。
- `L102` 这一轮把荣誉系统补成了真实派生层：热心互助者、庄园设计师、节会活跃者、建设贡献者、远征协作者、集市协调者、传闻收集者和世界见证者八类荣誉现已根据协作委托、庄园收藏、节会纪念册、村社贡献、远征结算、慢交易账本、交流大厅 / 信件纪念和世界事件记录自动解锁。
- 在线 smoke 也已补进 `L102-L104` 回归：当前会实际验证 `award_showcase.honors / commemoratives / titles / achievement_cards` 读回，确认荣誉与纪念层能和既有玩家史册、村社史册一起稳定回看。

- `L101` 这一轮把村社史册正式接进在线村社快照了：当前 `/api/taoyuan/online/societies` 已返回 `chronicle`，把成立日期、历任职位、公共建设列表、节会参与、主要贡献成员、关键事件时间线和年度总结收成同一份可回看的村社史册。
- 这轮史册实现继续走保守复用路线，不另造第二套村社时间线：入社、职位调整和社长移交会沉到 `role_history`，公共建设贡献与公共仓入仓会共同回填主要贡献成员，节会参与则直接复用已有节会纪念册做聚合。
- 在线 smoke 也已补进 `L101` 回归：当前会实际验证 `founded_at`、`role_history`、公共建设贡献史、节会参与记录、主要贡献成员、关键事件时间线和年度总结，确认村社史册可以稳定读回。

- `L100` 这一轮把玩家史册正式接进公开档案了：当前 `/api/taoyuan/online/profile` 已返回 `player_chronicle`，把第一次公开庄园、第一次被访问、第一次收到访客留言、第一次完成协作委托、第一次参加节会、第一次加入村社、第一次参与公共建设和第一次进入热门庄园榜这些联机“第一次”收成同一份可回看的玩家史册。
- 这轮史册实现继续走保守复用路线，不另造第二套事件总线：庄园来访 / 留言 / 收藏、协作委托 receipt、节会纪念册、村社成员记录与公共建设贡献，都会在读取公开档案时自动回填成史册里程碑，先把联机经历沉成长期痕迹。
- 在线 smoke 也已补进 `L100` 回归：当前会分别验证主账号与副账号公开档案里的玩家史册读回，确认庄园公开、来访、留言、协作委托、节会、入社和公共建设这些关键里程碑都能稳定解锁并保留时间戳与摘要。

- `L93` 这轮把世界纪年补进了 `world-event runtime`：当前已返回 `recent_chronicles`，把每轮纪年的 `cycle_key / 年份 / 公共进度 / 已完成事件数 / 世界史册摘要` 收成可回看的世界快照；分区首个完成者、年度冠军村社和著名庄园也都能继续沉淀进纪年面板，不再只是单条事件的临时回显。
- `L92` 这轮把世界公共目标补成了统一汇总层：季节大事件与作用域世界事件已经汇总成 `public_goal`，节会页现在能直接展示世界公共进度条、阶段奖励、全服里程碑与分区奖章，先把“世界现在推到哪了”这层看板跑通。

- `L91` 这一轮已经把作用域世界事件真正接起来了：当前继续保留单一 `server/src/taoyuanWorldEventRuntime.js`，并在同一套 world-event runtime 里补齐了 `global / division / neighbor / society / limited_time / anomaly` 六类世界事件，不再把世界事件拆回多套散实现。
- 这批作用域事件现在也都带有真实上下文：全服事件按季节共享进度，分区事件按账号稳定分区，邻里 / 村社事件会根据真实归属返回 `active / locked`，限时与随机异象按当天窗口生成；不满足条件时会明确给出锁定原因，而不是直接在前端消失。
- 在线 smoke 这一轮也补进了 `L91` 回归并重新全量跑通：当前会实际验证世界事件总览、作用域事件列表、`global_confluence` 贡献写路、`society_convention` 锁定态回读，以及整条在线 smoke 在接入 L91 后仍然稳定通过。

- `L90` 这一轮先把四季大事件从节会房间里拆出来了：现在已经有独立的 `server/src/taoyuanWorldEventRuntime.js`，专门承接春耕大典、夏汛防洪、秋收会盟和冬藏祭礼四条季节世界事件，不再继续把共享世界目标硬塞回短房间状态机。
- 当前四季大事件已经不是静态预告：每个季节事件都有独立目标、进度条、贡献动作、逐成员结算、史册摘要和个人贡献记录；事件达成时会真实把铜钱、世界贡献记录和季节徽记写回个人服务端存档。
- 节会页现在也长出了第一版世界事件承接：当前季事件、贡献榜、最近史册和自己的世界贡献摘要都可以直接在 `FestivalView` 里看见，不需要额外再挂一个孤立的“世界事件”入口。
- 在线 smoke 已补进 `L90` 专项回归：当前会实际验证世界事件总览、双账号贡献推进、自动结算、史册回读，以及个人存档里的真实落账结果。

- `L84` 这一轮把海域共探也推进成了真实专项闭环：`sea_probe` 房型现在已经能完整跑通建房、拉人、ready、开跑、提交海域动作、结算并关闭，不再只是远征页里一个未来占位入口。
- `航线分工 / 应对海况 / 海货结算` 三种动作现在都已有真实运行态证据：动作会进入共享进度、成员贡献、最近事件和结算凭证，房间关闭后回读个人服务端存档，也能确认海探奖励已经真实写回。
- 这轮还把海域线的结算差异补实了：房间会稳定回写 `luminous_algae / wind_etched_core` 等海探线奖励，并在专项 smoke 里显式验证 4 人房型人数上限与 `expedition_sea` 玩法模板挂载。
- 在线 smoke 现已补进 `L84` 专项回归：当前会实际验证 `sea_probe` 房型、`expedition_sea` 玩法模板、三类海域动作、4 人海探房间链路和海探奖励真实回档。
- `L83` 这一轮把协作护送线也推进成了真实专项闭环：`escort_convoy` 房型现在已经能完整跑通建房、拉人、ready、开跑、提交护送动作、结算并关闭，不再只是远征页里一个占位入口。
- `护送推进 / 稳固货物 / 途中事件` 三种动作现在都已有真实运行态证据：动作会进入共享进度、成员贡献、最近事件和结算凭证，房间关闭后回读个人服务端存档，也能确认押运奖励已经真实写回。
- 这轮还把护送线的结算差异补实了：房间会稳定回写 `paper / wood / ancient_waybill` 等押运线奖励，并在专项 smoke 里显式验证 4 人房型人数上限与 `expedition_escort` 玩法模板挂载。
- 在线 smoke 现已补进 `L83` 专项回归：当前会实际验证 `escort_convoy` 房型、`expedition_escort` 玩法模板、三类护送动作、4 人护送房间链路和押运奖励真实回档。
- `L82` 这一轮把协作采集线也从“目录里挂了模板”推进成了真实专项闭环：`gathering_line` 房型现在已经能完整跑通建房、拉人、ready、开跑、提交采集动作、结算并关闭，不再只是远征页里一个待以后再验证的入口。
- `组队采集 / 共享进度 / 稀有材料` 三种动作现在也都有了真实运行态证据：动作会进入共享进度、成员贡献、最近事件和结算凭证，房间关闭后回读个人服务端存档，也能确认采集奖励已经真正写回个人档案。
- 这轮还把协作采集的结算差异补实了：房间会稳定回写 `wood / herb / marsh_spore_sample` 等采集线奖励，并在专项 smoke 里显式验证 4 人房型人数上限与 `expedition_gathering` 玩法模板挂载。
- 在线 smoke 现已补进 `L82` 专项回归：当前会实际验证 `gathering_line` 房型、`expedition_gathering` 玩法模板、三类采集动作、4 人采集房间链路和采集奖励真实回档。
- `L81` 这一轮把协作矿洞也从“模板骨架”推进成了真实专项闭环：双人、三人、四人三套矿洞房型现在都已经能分别建房、拉人、ready、开跑、提交矿洞动作、结算并关闭，不再只是远征房间目录里挂着三个待验证名字。
- 这轮把矿洞模板差异也真正验出来了：双人 / 三人 / 四人矿洞会各自保留不同成员上限，并在结算里稳定带回 `stone / paper / ancient_waybill / archive_rubbing / ley_crystal_shard` 等差异化矿洞奖励，不再只有同一套远征默认掉落。
- `分工采集 / 白路标记 / 处理危机` 三种矿洞动作现在已经都有了真实运行态证据：成员动作会进入共享进度、成员贡献、最近事件和结算凭证，房间关闭后再回读个人服务端存档，也能确认矿洞奖励已经真的落回个人档案。
- 在线 smoke 现已补进 `L81` 专项回归：当前会实际验证 `cavern_duo / cavern_trio / cavern_quartet` 三种房型、`expedition_cavern` 玩法模板、三类矿洞动作、模板差异化奖励，以及不同人数矿洞房间的真实回档。
- `L80` 这一轮把远征房间真正接成了在线闭环：现在已经有独立的 `/api/taoyuan/online/expedition/rooms` 总览、建房、邀请、加入、准备确认、倒计时、断线、重连、玩法动作、撤离结算和关闭接口，不再只是把“多人远征”停在 TODO 里。
- 这条线继续保守复用统一活动房间底座来承接，不另起第二套 runtime。远征房间会沿用现有房间状态机、逐成员结算凭证和关闭阶段落账口径，尽量减少和节会、后续协作探索房间分叉出两套规则的风险。
- 远征奖励也不再只是房间内预览：现在 `settle` 会先生成逐成员 receipt，`close` 再把铜钱和远征材料真实写回个人服务端存档；房间关闭后再次 `close` 会被拒绝，避免断线恢复或重复提交把同一场奖励重复落账。
- 游戏内也已经长出第一版远征入口和远征页：现在可以从区域地图进入远征房间页，查看模板、创建房间、邀请队友、执行玩法动作并回看最近 receipt，远征开始有了能直接点通的前端承接。
- 为了把这轮结果收稳，在线 smoke 已补进远征房间专项回归：当前会实际验证模板目录、建房、邀请、加入、双人 ready、倒计时、断线、重连、玩法动作、撤离结算、关闭、重复关闭保护，以及 `wood / paper` 等远征材料和铜钱的真实回档。
- 村社 `L75` 这一轮也收口了：现在不只是能建社、入社和退社，整条共治链的关键结果也开始能稳定继承。提案投票结果、公共建设完工后的世界反馈，以及村社等级、福利和公共仓状态，都不会因为成员流转就直接丢失。
- 公共建设这轮的“改变世界”证据也补实了：像修桥这类工程在真正完工后，会明确保留完工反馈、世界反馈和村社活动日志，不再只是内部进度条刚好走满。
- 这套回归现在已经不是散点检查：在线 smoke 会连续验证建社、加人、投票、公共建设完工、公共仓入仓、成员退出、再次加入和社长移交后的权益继承，村社这条线第一次有了完整阶段验收。
- 村社这轮又补齐了一条很关键的生活化链路：现在成员已经可以真正退出村社了，不再只能加入后一直挂在组织里；如果社长是最后一名成员，退出时还会顺带解散这张空壳村社卡片。
- 这条退出链也不是只改界面状态：普通成员离社后，成员列表、自己的村社归属和社内活动记录都会同步更新；如果社长离社但村社里还有人，社长身份会自动移交给最早留下来的成员，避免组织卡在“没人能管”的半失效状态。
- 在线 smoke 也已经把这层补进 `L75` 回归：当前会实际验证村社创建、加入后再退出的真实写路与回读，村社成员流转第一次具备了“可进可退”的完整验证。
- `L74` 这一轮把村社成长也接进在线层了：现在村社会按公共建设完成度、成员共建次数和公共仓入仓次数自动提升等级，并开始解锁一整条可见的村社福利线。
- 村社页里现在能直接看到等级称号、福利经验、已解锁福利和后续成长目标，不再只有“有个村社”却看不出它这周到底往前走了多少。
- 公共仓这轮也真正能用了：成员现在可以把木材、石料、纸张、草药或公用经费补进村社公共仓，系统会真实扣减当前在线存档里的铜钱和材料，再把共用库存和最近入仓记录写回村社。
- 不同主题的村社也先长出了第一版专属方向：现在已经能看到各自的专属节会、装饰和任务预热内容，先把“这个组织会往哪里长”展示出来，更深的专属活动流程留给后续继续扩。
- 为了把这条权益线收稳，在线 smoke 也补进了公共仓入仓、存档扣减、等级 / 福利回读和仓库日志验证，`L74` 第一轮已经具备基础回归能力。
- `L73` 这一轮把村社“共建”也真正接进在线层了：现在村社已经有修桥、修码头、建集市、建书院、修灯街、扩仓库、修温泉和建祠堂八项公共建设，成员终于能一起把组织目标推进成看得见的公共工程。
- 公共建设现在不是只有一条说明文案：村社页会直接显示工程进度、剩余进度、最近捐献记录、个人贡献次数、完工反馈和世界变化反馈，成员可以按固定捐献包往里交工钱、木料、石料或图纸文书。
- 这条共建链也已经接成了真结算：提交公共建设捐献时，会真实扣减当前在线存档里的铜钱和材料，再把工程进度与个人贡献写回村社；不再只是“点一下按钮，界面上长一格进度条”。
- 为了把这层收稳，在线 smoke 也补进了公共建设捐献、存档扣减、工程进度推进和公共建设回读验证，`L73` 第一轮已经具备基础回归能力。
- `L71-L72` 这一轮把村社从“挂名组织”推进到了“能治理的共同体”：现在村社已经有社长、管事、采办、账房、记录人和普通成员六种职位，不同职位会承担不同的入社、公告和提案权限。
- 玩家现在可以对公开 / 半公开村社直接申请加入，也可以被管理层邀请入社；申请、邀请、接受和拒绝都已经变成了真实在线流转，不再需要靠线下约定“你先自己记一下”。
- 村社页里第一版公告和提案链也已经打通：有权限的成员可以更新公告、发起提案、参与投票、归档结果，并回看历史提案记录，村社终于开始拥有“共同决定事情”的长期痕迹。
- 为了把这条治理线收稳，在线 smoke 也补进了村社申请、职位轮转、公告写回、提案创建、投票、归档和历史回读验证；`L71-L72` 第一轮现在不只是界面能点，而是已经具备基础回归能力。
- `L70` 这一轮先把“村社”真正从想法落成了可进入的在线层：现在已经能创建自己的村社，保存名称、简介、徽记、主题、公开范围、成员容量和入社条件，不再只能把“共同治理”停在 TODO 里。
- 游戏里也长出了第一版村社入口：主导航和移动地图菜单现在都能直接进“村社”页，能看到自己的村社卡片、最近动态和基础成员名单，也能浏览其他公开 / 半公开村社的基础信息。
- 这条新线同样已经接进在线 smoke：当前会实际验证村社总览读取、创建村社、创建者回读自己的村社，以及其他账号能从公开列表里看到这张新建村社卡片，第一轮不再只是本地静态页面。
- `L64` 这一轮把节会纪念册真正落到个人档案里了：现在每次节会房间正式关闭、奖励真实写回时，系统都会同步记录你参加的是哪一场节会、挂的是哪种玩法模板、拿到了什么奖励、和谁同场，以及这场节会留下的合影文案。
- 节会页右侧现在也能直接回看“最近纪念册”：不只是知道自己刚拿到了多少钱或什么装饰，还能顺手看到同场成员、同场好友和这场节会的留影文案，节会开始有了可回看的个人痕迹。
- 为了把这层收稳，在线 smoke 也补进了纪念册回读和重复关闭保护：现在会实际断言节会纪念册里的房型、玩法模板、同场显示名和合影文案都能稳定回读，也会显式验证房间关闭后二次 `close` 会被拒绝，不会重复发奖。
- `L63` 这一轮把节会奖励真正从“预览”推进成了“逐成员安全落账”：现在参与奖励、协作奖励、排名奖励、纪念奖励、限定装饰奖励和节气称号奖励都会先生成到每位成员自己的节会结算凭证里，不再只是看一眼全零占位。
- 节会房间也不再一到结算就直接“假装结束”了：`settle` 现在生成的是待写回凭证，房主点击关闭时才会按成员逐条把铜钱、节会纪念券、限定装饰和节气称号写回个人存档与公开档案；只有全部成功后房间才会真正 `closed`。
- 为了把这条链收稳，我又给节会奖励补了幂等保护：个人存档会记住已经应用过的节会 receipt key，重复关闭或重试不会再把同一笔钱、同一盏装饰灯或同一个节气称号重复发第二次。
- 在线 smoke 现在也不只验证节会动作和房间生命周期，还会实际回读奖励落档结果：会检查节会奖励加钱、纪念券写入、限定装饰入档，以及房主公开称号更新，`L63` 已经第一次进入真钱回归。
- `L62` 这一轮把节会玩法层也接进房间运行态了：现在房型和玩法模板终于拆开，创建房间时可以分别选择节会房型和玩法模板，不再把“端午赛舟”“七夕同游”这种场景名直接当成具体玩法本身。
- 这批玩法模板先按最小闭环落成了七类骨架：公共进度、小队协作、抢答、拼装、采集、表演和合照都会带着自己的目标说明、共享进度、团队分数、成员贡献和可执行动作进入同一套节会房间，不用为每个节会重新发明一条运行态链路。
- 节会页里现在能直接看见当前房间挂的是哪种玩法模板、进度推进到哪里、谁已经贡献过多少动作；房间进入 `running` 后，也可以立刻提交最小玩法动作，不再只有“开房 -> 倒计时 -> 结算”这条空骨架。
- 我也把这层一起补进了在线 smoke：当前不仅会断言七类玩法模板目录存在，还会实际验证玩法模板选择、房间进入运行态后的动作提交，以及成员贡献和进度回读，`L62` 已经第一次进入可重复回归。
- `L60` 这一轮先把节会房间底座搭起来了：现在已经能真正创建节会房间、邀请好友加入、一起进入准备确认和倒计时，不再只是节日小游戏各自单机开场。
- 这套房间现在还有最基础但关键的保护层：成员断线后房间会进入暂停保护，恢复连接后再继续推进；结算时也会按成员逐个生成凭证，不把“房间结束了”直接当成“奖励已经乱写回档”。
- 我也把这条链补进了在线 smoke，当前会实际验证开房、邀请、加入、双人 ready、倒计时、断线重连、结算和关闭，节会同场联机第一次有了可重复回归的底座。
- `L61` 这一轮也不再只是列名字了：元日守岁、上元灯会、端午赛舟、七夕同游、中秋赏月和腊八共煮六种节会房型都已经能在同一个房间入口里被创建、读取和回归验证，后面要补的是各自更具体的玩法内容，而不是先把房间骨架再重做一遍。
- `L54` 这一轮把慢交易真正接进了“官方调控”层：现在每周交换站、节庆摊位和邻里寄售都会一起吃价格区间、稀有品限制、开放开关、反刷频率和黑名单制裁，不再只是各自能交易、出了问题再追。
- 商店页里也补出了第一版官方调控看板，玩家现在能直接看到哪些来源开放、不同链路允许的价格带，以及自己今天还剩多少交易空间；如果当前账号正处于限制状态，也能更快看懂为什么这次不能继续操作。
- 为了让这套治理不是只写在说明里，我把在线 smoke 也补到了治理链路：现在会实际验证治理看板、管理员调控读写、黑名单制裁和被制裁账号的真实拦截，第一轮集市已经具备基础反通胀约束。
- `L53` 这一轮把三条慢交易链统一收进了一份可回看的交换账本：现在每周交换站、节庆摊位和邻里寄售都会一起进入记录面板，不再各自散在不同页面里。
- 交换记录现在会把来源、双方、物资、价格、次数、品类和异常状态一起写清楚，玩家可以从商店页直接回看最近的交换流水，不用再去猜“这笔钱到底花在哪了”。
- 我还补了第一版争议上报和基础交易声誉：碰到价格、物资、到账、过期或取消问题时，可以先登记争议，账本也会顺手记住常往对象和常交易品类，后面做官方调控会更好落地。
- `L52` 这一轮把节庆摊位也接成了真链路：现在会按现实周主题轮换开放临时摊位，能卖限定材料、纪念品、节日食物和活动票券，商店里的交换站终于不再只有“周站”和“邻里寄售”两种来源。
- 节庆摊位这条链路现在已经是真结算：买食物会直接进背包，买票券则会直接写进钱包里的 `rewardTickets` 和累计入账，不会再把活动票券硬塞成普通物品。
- 为了让这条联机链路更稳，我也把在线 smoke 补到了节庆摊位：当前会实际验证摊位读取、食物购买、票券购买、铜钱扣减和存档回读；同时在 `QA_ONLINE_SMOKE_FORCE_LOCAL=true` 时允许强制开放摊位，避免现实周切换把回归跑飘。
- `L51` 这一轮把“邻里之间慢慢换东西”也做成真链路了：现在加入同一邻里的玩家，可以在商店里的交换站挂出固定价寄售，只对本邻里公开，或进一步收窄到“仅邻里好友”可见，不再只能等官方周站轮换。
- 这套邻里寄售已经能完成整条闭环：买家付钱后会立即拿到物资，卖家会同步收到铜钱；如果临时改主意，也可以主动取消挂单，挂单过期后还能把物资收回来，不会出现“东西挂出去了就卡死在空中”的半结算状态。
- 第一版寄售当前先只开放普通品质物资，目的是先把范围、定价、回收和跨账号落账收稳；对应的在线 smoke 也已经覆盖挂单、购买、取消、过期回收和资金回读，避免这条新交换链路把原有单人经营存档写坏。
- `L50` 这轮把每周交换站补成了真正可分辨的慢交易系统：现在不只是有固定限量换物，还会按分类拆成 `慢交易 / 节庆主题池 / 邻里专属池`，并根据现实周轮换节庆主题、按玩家邻里身份决定专属池可见性。
- 商店页里的交换站面板也跟着补了分类总览和分段展示，玩家现在能直接看见本周到底是哪些池子在开放，不会再把所有换物当成同一坨列表。
- 服务端这条链路继续保持真实落档：每周站点配置、个人兑换记录、分类池状态和存档物资扣增都会持久化保存，在线 smoke 也补进了节庆池、邻里池与换物回读验证，避免“前端能看见、规则其实没生效”。

## 2026-05-15（开发中）

- 这一轮先按 `0515审查.md` 收了一批最容易直接伤到玩家体验的断链问题：晨间事件、成就、主题周奖励、关系奖励、公告板委托和组合订单里多处失效的 `itemId` 已修正，不再出现“界面说发了奖励，但背包里什么都没有”的假反馈。
- 配偶晨间做饭奖励池改成只使用真实存在的菜品；晨间事件奖励失败时也会区分“配置异常”和“背包不足”，不再把两类问题混成同一种误导性日志。
- 日结顺序上收掉了几条会明显影响数值和平衡的问题：去掉了“喂一次草料顶两天”的免费复用、跨季时雇工不再抢在枯萎前自动收掉过季作物、墨白的体力奖励改到 `dailyReset()` 之后生效、雷暴改为按刚结束那天的天气结算。
- 行旅图这边修掉了“先扣时间再告诉你不能结算”的断链：区域事件完成结算不再在扣时后再次被 bedtime 校验拦下；路线、事件和首领奖励返回值也改成只回传真正入包的物品，避免日志和 UI 继续显示“带回了奖励”但实际没到账。
- 钓鱼宝箱现在只会在主鱼成功入包后结算，主线任务提交也补上了提交锁和完整回滚，避免出现“物品先扣了，但奖励或状态没落稳”的半结算。
- 周目标跨周结算改为使用旧周 `weeklyGoals` 快照；`Top Goals` 里原本容易和任务页主线混淆的“主线里程碑”文案，也先收口成了“经营里程碑”。
- 仙缘记忆链的领取逻辑补上了归属、结缘状态和阶级校验，未完成结缘或层级不足时不再能把记忆错误标成“已领”；进度文案也从“已领取”收口为“已归档”。
- 矿洞这边也顺手把一个很容易让人火大的半结算点收住了：主矿洞 BOSS 的首杀武器、戒指、帽子、鞋子和楼层主奖励现在统一在一个原子入口里发放，不会再先写首杀状态和装备、再因为背包校验失败把楼层奖励卡掉一半。
- 在线链路这边也补了一条真正能从游客一路走到玩家态的 smoke：现在会自动验证未登录拒绝、临时注册、服务端存档槽位写入、大厅发帖与回帖、系统邮件与管理员奖励邮件、邮件已读 / 领取，以及回读存档确认奖励真钱到账。
- 仙缘记忆链这次也终于补上了真实落点：现在归档结缘记忆时会校验归属和灵契层级，真的发放对应奖励，异常时还能回滚，不再只是把一条记忆干巴巴地记成“已领”。
- 我又把这条在线 smoke 往后台侧多拱了一步：现在连悬赏帖的最佳回复发奖、楼主删帖退款、玩家举报到管理员处理也会一起测，已经开始覆盖“玩家写入 + 后台介入”这条更像真实线上环境的链路。
- 云控后台本身也补出了运行态摘要：平台启用时，可以直接看到当前实际生效来源、托管字段和最近回退原因，不再只盯着“发过哪些版本”发愣。
- 对当前这台机器暂时起不来 Playwright Chromium 的情况，移动端 smoke 和 E2E 冒烟现在都会明确写成“已跳过”，不再把环境限制误报成整仓回归失败。
- 当前这批修复已重新通过 `npm --prefix taoyuan-main run type-check`、`npm --prefix taoyuan-main run lint`、`npm --prefix taoyuan-main run build`、`npm --prefix taoyuan-main run qa:late-game-samples` 与 `npm --prefix server run qa:online-smoke`。


这份日志面向玩家与社区，按日期倒序整理，优先记录玩家能直接感受到的玩法更新、体验变化与重要修复。

说明：以下内容以已确认版本为主；若文中明确写到“开发中”或“当前工作区”，则表示这部分已经在本地实现并通过基础验证，但尚未进入正式版本发布记录。

## 2026-05-18（开发中）

- `0518联机plan.md` 这一轮先不再悬着了：现在已经把联机蓝图接进 `docs/online/` 执行锚点，并固定为 `庄园 / 邻里 / 委托 / 节会 / 村社` 五条主线，后续不会再把“联机”混写成一个笼统的“多人模式”入口。
- 同时补完了第一版联机底座盘点：账号 / 登录 / CSRF、服务端存档、邮箱和交流大厅，已经分别标出哪些能直接复用、哪些需要扩展，以及哪些单人运行态必须继续留在本地存档里。
- 联机底座这轮又往前推了一步：在线层的命名习惯、runtime 切分、前端 store 口径和联机事件命名，现在已经统一收进 `docs/online/06-naming.md`，后续不会再一边叫“大厅活动”、一边叫“多人房间”、另一边又叫“联机事件”。
- 这轮也把联机最容易失控的那层边界先钉住了：`个人存档 / 联机事件 / 房间状态 / 结算凭证` 现已拆成四类对象，并补上幂等 key、冲突优先级、断线重连、重试和补偿策略，后续不会再让“帖子发出去了”或“房间结算了一半”这种中间态直接冒充最终到账。
- 现在连实时房间的生命周期也先收口了：创建、邀请、准备、倒计时、运行、暂停、结算、关闭和中止都已统一成一套状态机，后面做节会、赛舟、协作远征时不会再各自长出不同的“房间进行中 / 活动结束中 / 正在发奖中”说法。
- 这一轮又把最关键的后台可追责层补了出来：联机审计入口、奖励凭证扩展字段、补偿记录对象和管理端查询视图已经先定义好，后面无论是送礼、委托还是房间结算，都得能回答“谁改的、给了什么、失败后怎么补、后台怎么查”。
- 联机从纯底座文档开始往真实功能挪了一步：现在游戏里已经能打开第一版“公开名片”，并从当前账号与服务端存档里自动拉出昵称、庄园名、季节进度、主营方向、最近活跃、公开称号、邻里身份和本周展示主题，还能保存一句公开介绍与公开状态。
- 这轮又把“认识别人”往前推成了真链路：现在已经能发起好友申请、接受 / 拒绝申请、拉黑 / 解除拉黑，并在同一个面板里看到收到的申请、发出的申请、好友列表和已拉黑玩家。好友排序当前先按最近互动和最近活跃摘要走，后面再接更细的联机在线态。
- 邻里这条线现在也不再只是 TODO 里的名词了：已经可以创建邻里、申请加入、发起邀请、处理申请 / 邀请、调整成员身份、维护邻里公告，并看到邻里等级、成员数和最近动态。当前还是第一版小团体骨架，但已经能把“好友关系”推进到“稳定的小组关系”。
- 公开名片这轮又多了一层“玩家气质”：现在会按种植、钓鱼、育种、收藏、节庆、互助、装饰、探索这几类来源自动长出关系标签，玩家也能手动选少量标签固定到名片上；好友列表里也会同步显示这些标签，开始能一眼看出对方更像哪种经营者。
- 关注与订阅也先长出第一版了：现在已经能关注某类庄园风格、订阅某类玩法高手、订阅当前邻里，以及订阅节庆活动主题，还能在同一页里查看和取消已有订阅。动态提醒目前先停留在订阅清单入口层，后续再把“订阅后收到更新提示”补完整。
- L1 这整层现在已经能闭环跑起来了：公开名片、好友申请、邻里小组、关系标签和订阅入口都已经接进游戏内同一个社交面板，订阅动作也会立即生成可见的“订阅动态”提示，至少不会再出现“点了关注但什么反馈都没有”的死按钮体验。
- L2 这轮也开始往真实页面走了：现在已经有第一版“公开庄园”页，会把庄园名、展示主题、主视觉摘要、经营标签、当前重点和本周目标整理成一张可被别人看懂的庄园快照。主视觉目前先用摘要承接，后面再补真实截图资源。
- 庄园页这轮也开始“有人来过”了：现在访客已经能在庄园页留下文本留言、祝福和建议，主人也能直接回复或置顶，庄园展示不再只是静态卡片。
- 庄园留言墙这轮又往前补齐了一层：现在图章和签名不再只是后端里预留的类型口径，庄园页已经能切换到图章 / 签名模式，给出专门提示和快捷短句，并在留言列表和故事模板里用不同视觉样式展示这些来访痕迹。
- 这轮还把“来过”从感觉做成了记录：现在庄园页会留下谁来过、什么时候来、为什么来、做了什么、留下了什么反馈，以及是否顺手带走了需求的痕迹，庄园开始更像一个真的被人访问过的地方。
- 导览这层现在也起步了：庄园主人已经可以设置推荐参观点，系统会自动整理成一条主题参观路线，并且会在庄园页汇总“今天来了哪些人”的导览摘要。当前还是摘要式回放，但已经开始能把庄园展示组织成一条路线，而不只是平铺信息。
- 收藏和关注这层也先接起来了：现在已经能收藏庄园、关注庄园更新，并在庄园页直接看到同主题收藏列表和热门庄园榜。当前热门度先按收藏次数做轻量榜单，后面再继续叠加更真实的互动热度。
- 庄园主题周这轮也落了地：现在庄园已经能按季节长出主题周选项，系统会给出主题分、推荐主题和轻量“官方精选”判定，庄园展示开始从静态快照进一步进入周期性主题玩法。
- 庄园展示模板这轮也补上了真实切换：现在主题周里已经能保存展示模板，并把庄园预览卡切到展示类、经营类、节庆类、收藏类或故事类五套信息布局，不再只有一张固定庄园卡反复换标题。
- 这轮也顺手把庄园链路真正拉进了在线回归：公开庄园页访问、访客留言、来访记录、主题模板切换和热门庄园榜，现在都已经进入可重复执行的 smoke，不再只靠手点确认。
- 求助单这轮也开始真正能发了：现在可以在游戏里发布求助单，按公开 / 好友 / 邻里控制范围，并且能用在线 smoke 直接验证不同关系下的可见性。
- 求助单这轮又往前推了一步：现在公开单可以被接下，接单人可以取消接单，短时求助单也会按截止时间自动过期，求助入口开始有了最基础的状态流转。
- 这轮又把求助单补成了第一版真结算：接单人现在能提交交付说明或资源记录，发布人确认后会生成结算凭证并把回报安全写回，重复提交也会被幂等保护拦住。
- 求助单这轮还顺手长出了互助声望：完成协作后会累积帮助声望和专业方向声望，玩家之间的常帮关系也会被记下来，后续求助单列表会更偏向最近真正互助过的人。
- 求助单这轮也开始支持多段接力：一张单子现在可以拆成多个阶段，不同玩家分别接下并完成各自阶段，整单在全部阶段确认后会自动收口。
- 求助单这轮又长出了一层真正可用的“互助推荐”：现在列表会综合你的公开标签、最近活跃近似状态、好友 / 邻里关系和已有互助记录，给出推荐分和推荐理由，不再只是把所有可见单子平铺出来让人自己猜先帮哪张。
- 这批在线 smoke 结束后会自动清理掉测试用的 `smk*` 账号，避免测试用户残留在正式环境里。
- `L34` 这轮已经把多段接力的最小闭环跑通：可以把一张求助单拆成多个阶段，不同玩家分别接下、交付和确认各自阶段，全部阶段完成后整单收口。
- `L35-L36` 这一轮也跟上了：求助单现在会把“这张单为什么更适合你接”直接写出来，在线 smoke 也开始断言好友单、邻里单和标签推荐理由确实会返回。
- 邮箱这轮也正式开始从“系统奖励箱”往“玩家情感通道”转了：现在玩家之间已经能直接互寄书信，支持节气信、节庆贺信、祝福卡、短讯，以及可附一张图片的合照附信；邮箱列表和详情页都会明确显示寄信人和信件类型。
- 礼物包裹这轮也接上了：现在玩家可以把材料、种子、鱼类补货、装饰物和纪念品通过邮箱寄给别人，寄出时会真实扣减自己存档里的物资；收件人则在邮箱里预览包裹内容后再领取。
- 邮箱这一轮又补上了更像“生活往来”的管理感：新到邮件会在邮箱里给出更明显的提醒，重要邮件可以置顶保留在上方，已经领过奖励的包裹和结算邮件也能直接回看最近凭证，不会一清空就什么痕迹都没了。
- 纪念册这轮也终于长出来了第一版：现在邮箱里已经能分别回看收过的信、送过的信，并把特别想留的往来信件手动存进纪念册。节气、好友、村社这几类筛选入口也先接上了，后面再继续补更完整的历史检索。
- 这轮又把纪念册的关系筛选压实了：不只是有按钮，现在好友来信和村社来信都已经能被真实筛出来，至少“想回头找某个重要关系里的往来信”不再只能靠手翻。
- 本轮的 smoke 清理也补上了测试账号删除，不会再让 `smk*` 用户一直挂在库里。
- 云控里的静态文案现在终于更像正常富文本输入框了：首页“关于游戏”正文和 AI 欢迎语已支持多行 HTML 容器、常见排版标签，以及安全范围内的颜色、对齐、字号、行高、间距等内联样式，不再只能吃很克制的几种 HTML 片段。
- 这次也把“预览看着一套、首页弹窗出来又是一套”的别扭感收掉了：后台关于页预览和主菜单里的实际弹窗，现在都走同一套宽松富文本渲染规则。
- 同时保留了安全边界：脚本、表单、嵌入类标签和危险样式仍会被拦掉；AI 助手实时回答也没有跟着一起放宽，避免把普通问答气泡一并带成可随意吃 HTML 的入口。

## 2026-05-10（开发中）
### WS01 ~ WS08 长线扩展执行启动

- 已开始把这一轮“借鉴《星露谷物语》结构层玩法”的长期扩展，从规划文档接入到工程底座。
- 已建立统一执行锚点，后续会按 `WS01 ~ WS08` 分线推进并持续回写版本记录。
- 已补上第一批底层支撑，包括发现记录、世界变化记录、稀有来访记录的统一账本入口，方便后续多系统共用。
- 已给社区修复、村庄建设、旅行商人、秘密纸条、特殊订单、日历与技能成长补齐扩展锚点，后续内容会按 `WS01 ~ WS08` 分线推进。

### WS01 社区修复与世界变化 2.0 第一轮落地

- 祠堂收集和村庄建设现在开始真正绑在一起了：部分祠堂礼单会直接提示推荐承接的建设线，不再只是交完奖励就结束。
- 村庄建设页新增了“祠堂 -> 建设映射”和“世界变化总览”，能直接看到哪些建设会改入口、开捷径、补服务、带来村民新反应。
- 第一批社区修复已经开始更像“修完世界会变”的内容，而不是单纯数值奖励：例如工台角、矿料棚、节庆暖房、商队驿站、学舍和温泉都会给出明确的修前传闻、修后反馈和跨页面变化提示。
- 家园设施页也会同步挂出已生效的世界变化，让玩家在日常浏览里就能感到“这个村子确实被我一点点修活了”。 

### WS05 特殊订单、传闻委托与赏格第一批落地

- 委托板现在开始更像“村里今天在传什么”了：新增了一批更短、更口语化的传闻轻任务，会带上村口流言、鱼汛口风、节前风声、商路异动这些来源味道。
- 任务页现在会记住你最近帮过谁、做过什么，同类委托还会打出“做过同类”和“熟客加急”标记，重复接单终于开始像关系积累而不是纯随机刷单。
- 普通委托、特殊订单、节庆 / 周赛票券和阶段表现，现在开始更明确地并进同一条奖券链；任务页和钱袋页都能直接看到“乡约牌 -> 祠堂赏格 -> 村衙赏契”的命名层与阶段奖池预览。
- 钱袋里的票券区不再只是余额和兑换按钮，已经能预览当前奖池阶段、后续会混入的功能种子 / 关系礼物 / 家居材料 / 深层赏物，让攒票券这件事开始有了长期期待。
- 第一批特殊订单也开始真的认世界状态了：部分订单现在要求你先把节庆暖房、商队驿站、学舍这类社区修复做起来，或先读过对应纸条线索，完成后还会回流新的生活 / 建筑提示，不再只是高配供货单。
- 特殊订单的发单人也明显更活了：这一轮把高地接运、街景补缮、节前大席、行旅残卷、前哨校准这些大单接给了更多村民，不再老是同几个人重复发同一种单。

### WS06 终局精通第一批落地

- 技能页现在开始长出真正的终局入口了：除了原有 Perk 树，现在还能直接看到五个主技能精通、三条混合精通和当前精通点，不再是技能满了之后就只剩数字停在那里。
- 这一版先把“农耕 / 采集 / 钓鱼 / 挖矿 / 战斗”五条主精通，以及“行旅大师 / 考据大师 / 生活大师”三条混合精通挂了出来，让后期玩家第一次能明确看到自己下一步是在补哪条汇流成长。
- 精通记录也开始写入统一账本了，后面再接祝福、饰物、地图能力和家园功能位时，就不需要重做这一层识别与记录。
- 精通这次还不只是看板：小屋里已经会给出每日祝福预告，角色页会认出护符 / 饰物位，设施页会认出高级工台权限，新手路线页也开始认出地图标记能力，后期成长终于开始反过来影响每天的浏览和判断。 

### WS08 生活设施、密匣与宠物角第一批落地

- 钱袋里的奖券循环现在更像一条能长期盯着的生活线了：除了阶段赏格预览，这一轮还把密匣类奖励正式接进了兑奖池，攒券不再只是在换即时补给。
- `密匣 / 山泽遗箱 / 灵物封匣` 这组桃源口径的神秘箱已经接成统一入口，玩家可以在同一个开匣案里查看来源、库存和大致奖励层次，不再散在各处各开各的。
- 宠物这轮也不再只是“每天摸一下”的摆设了：现在会按好感慢慢进入 `灵宠衔物 / 田犬报喜 / 猫叼线索` 这几种轻反馈，还会对节庆日子给出自己的反应。
- 牧场和家园页都开始认“多宠物路线”了：第二只、第三只宠物的开放条件、宠物窝 / 食盆位 / 饰物位这些宠物角成长，现在已经能被看到，也能真正继续往下接。
- 家园这轮还长出了第一批真正有功能的扩建位：`书房偏厢 / 待客茶角 / 祠前陈设墙` 会把书架位、祝福位、奖杯位和纪念物位做成实际可解锁的家居成长，而不只是停留在文案里。
- 这轮还把“每日祝福”和“饰物位”从占位字样做成了能生效的系统：`祠堂签 / 山神兆 / 节气气运` 会真实影响今天更适合钓鱼、出货还是外出跑图；`护符 / 玉佩 / 灵器碎片` 也已经能在角色页装备，并开始反向改变商店、钓鱼和挖矿这些旧系统。 
- 村庄建设页现在能看到首批新住户和驻村线：商队、学者和山灵各自会带来新货架、对话群、线索池和节庆回响，不再只是多一个静态名字。
- 行旅图、引导页和百科里的村庄地图开始变成“活地图”：会按季节、稀有来访、修复设施、节庆装点和短活动窗口显示不同标记。
- 商圈现在会记住近 7 天具体卖出了哪些东西，并把“最近村里流行什么”“村民怎么说”“货架为什么变”显示到商店和村庄页里；季节、节日、熟客关系、修复进度和天气都会进入这层货架解释。
- S7 已完成一轮回归验收：奖券、密匣、宠物、家居、祝福、护符、新住户、动态地图和商圈回响都已经接进既有页面与生活账本，没有再新增一堆孤立入口；本轮增量已通过 `type-check`、`qa:late-game-samples` 和 `build`。
- 收藏与资料页新增“桃源大奖章”总页签，会把图鉴 / 出货、秘密笔记 / 秘藏验证、主技能 / 混合精通、特殊订单 / 活动 / 见闻册这四条长期补完线放在同一页回看；奖励口径保持为归档、提示、入口回看和轻功能反馈，不做数值爆炸。

### WS07 活世界反馈 2.0 第一批落地

- 节日现在会按年份和单双年出现轻变化：同一个节日会在摊位内容、村民对话、奖池提示和地图装点上给出不同回响，不再像每年重复播放同一张静态背景。
- 小屋日历、NPC 日程和行旅图都已经能读取这批年度节日变体；玩家可以在当天提示里看到今年节日更偏向哪类物资、奖励或街景变化。
- 天气与季节异象现在会形成可见的环境窗口：钓鱼、挖矿、采集、行旅和节庆交付会读取同一组窗口信号，给出不同的风险、收益和提示文案。
- 商业回响继续加深：长期出货会形成常卖路线，商店会主动提及对应品类；村民与 NPC 弹窗也会把最近流行货物、节庆物资和修复设施变化纳入闲谈反馈。
- 行旅图新增动态地图高级状态：季节版、来访版、修复版、活动版会先汇总成四个地图状态，再按优先级展示具体信号卡，并同步影响当前远征提示。
- S8 已完成一轮回归验收：年度节日、天气 / 季节异象、商业回响和动态地图高级状态已经串到日历、NPC、商店、行旅图和村庄入口；同一张村图会按当日窗口显出不同的节日口风、货架解释、远征信号与街景变化。

### 0510 长线扩展总收口

- 这一轮 `WS01 ~ WS08` 已经从“规划锚点”推进到可回看的长期生活层：社区修复会改变世界，日历会提醒准备，礼物和纸条需要观察验证，特殊订单会带人物与世界状态，后期有精通终点，生活设施和活地图也能在多个入口持续反馈。
- 玩家侧最直观的变化集中在几条线：修祠堂和村建会开服务 / 捷径 / 新反馈，时历会提示节日、生日、稀有访客与短活动，任务板会出现更像村里传闻的委托，钱袋会承接奖券和密匣，小屋 / 牧场 / 家园会承接祝福、宠物和扩建，行旅图会展示季节街景与世界状态。
- 发布准备阶段会继续补齐本轮 smoke、截图证据、AI 助手知识项与总体验收记录，确保新增内容不只是“能运行”，也能被玩家找到、理解并持续回看。

### 2026-05-14（开发中）

- 修正了互动节“第二年奖池变化”的一个关键错位：年度追加铜钱和物品现在只会在小游戏领奖时结算一次，不会再出现日结先发一轮、领奖时再发一轮的重复奖励。
- 钓鱼大赛、农展会和端午赛龙舟的结算提示也同步对齐了：如果当年节庆带有额外奖池，小游戏页面会直接把“含年度追加”的总奖金显示出来，看到的金额和真正到账的金额现在一致。
- 行旅图这边也补了一刀偏底层的稳定性修复：地图页现在会明确走“纯读快照”来取季节变体、区域传闻和熟路巡行状态，不再鼓励 UI 在读取这些信息时顺手触发世界信号同步。
- 秘密纸条的“写进见闻记录”现在也终于不是嘴上说说了：验证成功后，对应记录会稳定保存在笔记侧，之后再回看这张纸条时，能直接看到当时沉淀下来的见闻文本，而不是只剩一条“已验证”状态。
- 驻村住户相关的商圈提示也收口到了当前真实进度：商店和村庄页现在会把这块明确写成“货架风向、线索传闻和驻村回响”，不再给人一种新住户已经把完整新库存和线索掉落池都正式接通了的错觉。
- 互动节小游戏的奖金提示也补齐到了同一口径。除了钓鱼、农展会和赛龙舟，灯谜、投壶、包饺子、烟花、斗茶和风筝这几项现在也会把年度追加奖金直接算进页面显示，总金额终于和最终领奖一致。
- 商店页里那些非书商的稀有来访，现在“已拜访”后真的会停下来，不会再因为重复点按钮把同一次来访反复记进长期记录。
- 精通系统里那几条还没完全做成真实功能的奖励提示，我也顺手收口了：高级工台、资源转化和地图标记现在会明确说成“后续方向 / 能力提示”，连新手路线页里的说明也一起收回到了这个口径，不再像已经完整实装的功能说明。
- 节庆变化这一块也开始统一口径了：现在日结、NPC 页、新手路线页、商圈看板，以及依赖节日判断的任务 / 纸条 / 宠物反馈，会共用同一份节庆解析上下文，把村庄建设、关系推进、配偶状态和主题周一起算进去，不再出现同一天不同页面各说各话的节庆版本。
- 我还顺手把几条还残留着的礼物线索错配收掉了。现在雪琴和丹青那几条线索，也会跟真实送礼结算一致，不会再出现“线索明明这么写，送出去反应却不是这么算”的别扭感。
- 行旅图世界信号这条底层语义也彻底收口了：现在不只是页面在绕开副作用，连 store 里旧的区域变体 / 传闻板 / 熟路状态 getter 也改成了纯读，世界信号同步只会在显式刷新或主动结算时发生。
- 这一轮针对 `0512审查` 的可证实问题清理到这里，也顺手做了完整回归：`type-check`、`build` 和 `qa:late-game-samples` 都通过，说明这批修补没有把后期样例档链路再带坏。
- 这轮修复已通过 `npm --prefix taoyuan-main run type-check`，属于对 0512 审查问题的第一批实修回写。
- 我又做了一轮 `0514` 复审，把“还真实存在的漏网之鱼”继续收了一批：`useNpcStore` 里剩下几处还只按年份判断节庆的调用已经补到统一上下文，NPC 日程、节庆口风和当天礼物线索不会再跟别的页面各算各的。
- 书商这边也补了一层旧档兼容。现在库存刷新时不只看“已购书 ID”，也会认已经写进生活账本的已解锁书，所以那些很老、只剩永久收益或生活记录的存档，不会再轻易把其实已经拿过的书重新刷回货架。
- 行旅图首领远征的开局同步也补齐了：首领线现在和普通路线一样，会在出发前先刷新当天世界信号，开局视野、变体提示和当日态势终于走到同一个节奏上。
- 商圈长期回响对旧档也做了更保守的恢复。要是缺失长期出货累计字段，现在除了近 7 天账本，还会参考“至少出过哪些货”的长期痕迹来恢复常卖路线，不再整条长期口碑都塌成一周短样本。
- 这一批补漏随后也重新跑过了 `type-check`、`build` 和晚期样例 QA，当前看没有把后期样例档、行旅图或商圈回响链路重新带坏。
- 我又把范围往上提了一层，做了一次全仓复审：不只看单机玩法，还把服务端存档、邮箱、交流大厅、AI 助手、官方云控和公共配置链路一起拉进来，第一版结果已经整理进 `0514全仓审查.md`。
- 这轮全仓复审里，除了玩法真问题，也额外抓出了两条“验证门本身”的风险：移动端 UI smoke 在当前环境里浏览器启动会报 `spawn EPERM`，而 Playwright 冒烟脚本在和别的 dev server 并行时会因为固定 `4175` 端口直接冲突。它们不是玩家线上 bug，但会影响我们后面回归门的可靠性。
- 我把这批在线收口继续往前推了一段：大厅和邮箱现在都改成复用统一的原子 JSON 写回 helper，就算在线奖励、悬赏发放或帖子数据恰好卡在写盘中断，也不会再各自走一套更脆的裸写路径。
- 主菜单现在也终于会把“公共配置到底是官方实时、官方缓存还是本地默认”直接告诉你了；如果返回入口链接被安全规则拦回站内首页，或者某些字段当前其实由官方托管，入口区会直接写明，不再只把原因埋进运行日志。
- 交流大厅首屏文案也降到了真实口径：在线可互动、游客只读、服务暂不可用这三种状态现在会分别给出不同提示，手机上的发帖浮按钮也会跟着真实状态禁用，不会再出现“看起来能发，点了才发现不行”的错位。
- 这轮还把 E2E 的端口冲突真正拆干净了。`test:e2e` 现在会自己分配端口并接管 dev server，之前和别的本地服务抢固定 `4175` 的伪失败已经收掉；剩下还没法在当前环境通过的，只剩 Playwright 浏览器启动 `spawn EPERM` 这一条外部限制。
- 后台这边我也把摘要补齐了一层：AI 面板和首页关于面板现在都会直说“当前到底吃的是官方实时、官方缓存还是本地默认”，同时把托管字段和最近回退原因写出来，运营侧不必再靠猜。
- 另外我补了一条真正会打服务端的在线 smoke。现在至少已经能自动验证健康检查、公共配置、AI 公共配置、大厅列表，以及未登录时的存档 / 邮箱 / 发帖拒绝路径，说明这批在线链路开始有最低限度的自动兜底了。
- 我又把这条在线 smoke 往前推到了“真玩家主链路”那一步：它现在会临时注册账号、拿会话和 CSRF、写服务端存档槽位、设当前槽位、发大厅帖子、创建系统邮件，再回读邮箱列表。也就是说，这条线已经不只是在看接口活着，而是在验证一个最小在线玩家流程能真正走完。
- 这个过程中还顺手捞出并修掉了一个真实服务端断点：自助系统邮件链路原来漏引了服务端存档目录 helper，导致 `POST /api/taoyuan/mail/system-campaign` 会直接 500；现在这条接口已经能在 smoke 里跑通。
- 我又把 smoke 往深处拱了一格：现在它连“登录后回帖、把奖励邮件标记已读、真正领取奖励、回读服务端存档确认钱到账、最后再删掉自己刚发的帖子”也会一起测。这样我们开始真正验证“写进去的状态有没有落回玩家档”，而不只是接口有没有回 200。

## 2026-04-30（开发中）

### 字号设置、关键弹窗与移动地图菜单收口

- 字号设置现在默认回到 16 号，并继续支持 8-24 之间逐档调节；想把整套界面调得更紧凑或更舒展时，不用再从偏小默认值重新拉回。
- 设置窗、存档管理和其他关键弹窗的外框宽度与主要点击热区，不会再因为全局字号调小而一起缩窄；字体可以继续变小，但弹窗本身不会缩成更挤更难点的一版。
- 设置窗内部也顺手做了密度重排：分页按钮、字号步进器、配色块和底部存档入口在手机上会保持更稳定的尺寸，不会出现“字变小了，整个窗口也跟着被挤扁”的感觉。
- 移动地图菜单现在改成以 16 号为基准联动缩放：当前推荐、主线 chip、常用工具卡和区域小方块都会跟着字号逐档变化，不再只有压到 12 以下才看得出区别。

### 行旅图稳定性与静默存档补强

- 修复了一类会让行旅图在部分手机或部分入口上直接崩掉的问题；锁区说明、区域承接和回城去向这类信息现在会更稳地完成初始化，不再因为页面一进来就读错依赖而白屏。
- 游戏现在会在后台每分钟静默自动保存一次，尽量在不打断当前游玩的前提下帮你兜住进度，不需要额外手动触发。
- 自动保存也学会了“该退就退”：如果你正在矿洞探索、当前钓鱼还没结束，或瀚海赌局仍在进行中，它会先跳过这次保存，不会在这些本来就不能存档的场景里硬写一轮失败。

## 2026-04-26（开发中）

### 行旅图锁区与入口收口

- 行旅图正式页已经移除了开发态操作、手动解锁、首领清关这类只该留在调试环境里的按钮，正式游玩时不会再在区域页里看到“强开进度”的入口。
- 未解锁区域现在会明确显示锁区预览和解锁条件，不再把完整路网、首领和事件操作提前摊开，避免出现“下方有按钮，但其实当前根本不能玩”的错位体验。
- 已经展示出来但当前还不能执行的路线和首领动作，现在会直接告诉你为什么不能出发，比如“已有进行中的远征，请先收束”，不再是点了像没反应一样的静默状态。
- 这一轮也把行旅图正式玩法和调试能力的边界收得更清楚：调试能力继续保留给内部调试页，玩家看到的 RegionMap 只保留真实可用的玩法入口。

### 行旅图首屏与回城办事单收口

- 行旅图页现在会先给出一张“当前建议动作”卡：如果你有进行中的远征、这周有焦点区域，或者刚回城还有办事单，页面会先直接告诉你下一步最值得做什么，并能一键跳到对应位置。
- 路线卡现在会更直接告诉你这条路更适合冲什么、主要带回什么、风险高低，以及是更适合手动探索还是已经适合巡行，不用先把整张卡的说明读完再自己拼结论。
- 回城后的旅后处理现在开始记住你已经处理过哪些承接动作；办事单会把“现在就去 / 随后处理 / 可稍后去”和“已处理”区分开，不会每次都像第一次看到那样一直悬着。
- 手机上的目标规划和地图菜单也更收口了：顶部目标先给简版主线摘要，地图菜单则会优先给你“当前推荐”的几个入口，减少先读一大屏信息再找按钮的负担。

### 行旅图移动端任务流与稳定性收口

- 手机上现在开始把行旅图收成更清楚的 5 步节奏：先选区域、再看路线、调整出发方式、处理中远征，最后回到回城办事单，不再把所有说明和台账一下子全摊在首屏。
- 行旅图里的横向路网在移动端改成了“看进度、再去下方路线卡真正出发”的单主交互，减少同一趟远征在两套入口里来回点的困惑。
- 区域切换入口也继续做了减法：原来的“全部区域”总览卡已经拿掉，现在只保留三张真实区域卡，先定去哪一张图会更直接。
- 行旅图现在也不会再因为路网里的“当前节点”自动对焦，把“当前建议动作”悄悄滚出首屏；手机上第一眼会更稳定地先看到这周该点哪里。
- 最新一趟回城办事单现在会被单独置顶，旧远征记录不再把刚结算过的那条重复显示一遍；地图菜单也会直接把你送去这趟回城最该先处理的承接页。
- 这一轮还补强了游玩过程里的兜底稳定性：就算数据库或联机链路短暂抖动，存档、邮箱和玩法日志也更倾向先保住本地进度，不再那么容易一整串 500 把当前游玩打断。
- 手机上的更早远征记录现在默认先收起，只有你主动展开时才会整段挂出来；常驻“旅后回看”也改成只有在你主动指定某条旧记录时才出现，不再默认把最新一趟回城结果再重复看一遍。
- 行旅图第一页还补了一张“看图说明”小卡，第一次进来时会把“看清进度 / 地图摸清 / 熟路 / 回城办事单”这些词先讲清楚，减少新玩法一上来先猜术语的停顿。
- 回城办事单里的“资源去向”在手机上也更收口了：同一批区域库存不会再在办事单、常驻回看和资源台账里各写一遍，而是直接提示你去下方总览统一处理。
- 行旅图手机首屏里最先要读的几段说明，这轮也顺手调成了更好读的字号和行距；如果最新办事单已经没有待处理动作，手机上默认也不会再整段摊开，首屏会更安静一点。

### 商圈与任务页移动端首屏继续收口

- 手机上进入商圈和任务页后，现在也会先给一张“当前推荐动作”卡，不再默认把玩家丢进一整页说明和列表里自己猜第一步该点哪。
- 商圈页会根据你当前是在买入还是卖出、有没有推荐货架、是否已经进店，先提示你去看推荐货架、先看市场看板，或先回到当前店铺货架，减少“进了商圈但还得先想一轮”的停顿。
- 任务页则会优先把“先交主线 / 先交进行中的任务 / 先看紧急委托 / 先看特殊订单”这类最该先处理的动作提到最上面，让接任务、交任务和清空任务栏的节奏更直接。
- 这一轮也继续把手机上真正要读的那几句提示放大了一档；如果你已经站在当前最推荐的页面里，顶部的简版规划也会少说一句重复跳转，首屏更像一条动作链，不像几层提示同时喊话。
- 我们还按几类常见手机尺寸重新复看了商圈、任务和行旅图，三页首屏都能更早露出真正可点的操作区，没有再出现横向挤爆或主动作被整段盖住的情况。
- 顶栏最上面那一行也继续做了减法：原来的“保存”和“保存并返回”双按钮收成了一个“保存”，点下去后再确认这次是不是要顺手返回，首行不会再被两个同级操作一起挤住。
- 目标规划卡的“更多 / 收起”也被收到了同一个右上角位置，展开和收起时不再一会儿看右上、一会儿又跑去卡片底部找按钮，操作位置更统一。
- 农田里的「一键操作」弹窗也补了一处手机可见性修复：原本在部分安卓机型上，无法执行的批量按钮会淡到像没渲染出来一样；现在会稳定保留为灰色禁用态，玩家能直接看清哪些动作暂时做不了。

### 钱袋、公会与鱼塘移动端首屏开始统一

- 钱袋、公会和鱼塘这几个中后期页，现在也开始补同一套手机首屏节奏了：先给一句轻量提示，再给一个“当前推荐动作”，不再一上来就把赛季总览、经济摘要、展示池、票券说明整段压在前面。
- 钱袋页现在会更早提醒你先看高地战备预算、先补本周预算，或先兑一轮票券补给；公会会优先提示你先领奖、先开第一条讨伐线，或先把可捐物资换成贡献点；鱼塘则会先把收获、治疗、喂食这类真正该先处理的动作提到最上面。
- 这轮也顺手把这些页的大说明块往展开区里收了一层，手机上进入页面后更容易先碰到能点的事，而不是先滚过一整段经营说明。
- 这次还把钱袋、公会和鱼塘补看到了更窄和更高的几档手机视口；这三页现在在常见手机尺寸里都能更稳定地先露出主操作区，不容易再被说明块挤出首屏。
- 当前这轮移动端复查里，相关页面也没有再复现会把流程突然打断的前端报错；至少在现有样例档和关键路径里，这批首屏改造没有带来新的显性异常。

## 2026-04-25（开发中）

### 4.3 行旅图交互重构补完

- 行旅图的手动远征现在改成了更像矿洞 / 瀚海那种“远征台面”：一旦出发，会切进覆盖式主场景，围绕当前节点、当前遭遇或当前营地一步步推进。
- 每次推进不再是点一下按钮立刻改完整段文字，而是会经历“等待一下 -> 揭示当前变化 -> 落到本步结果”的分阶段节奏，同一时刻只保留一个主决策面。
- 路线卡也做了收敛：现在更像真正的出发台，会更早提示这条路是熟路可巡行、必须手动，还是命中了季节变体、未兑现传闻与同行合同。
- 回城结算继续往正式玩法靠拢，已经升级成“旅程回顾 / 回流分发 / 旅后承接”三段式回执，不再只是一次性关掉就消失的说明弹窗。
- 这一轮重点是把已经接好的季节变体、传闻板、同伴合同、自动巡行阻塞和见闻册沉淀整理成更有过程感的交互节奏，底层远征规则本身没有被推翻重写。

### 4.3 同步推进补完

- 行旅图新增了区域级的“季节变体快照”和“本周传闻板”，会根据当前季节、天气和 NPC 在场情况给出本周该手动去看的路线提示。
- 熟路自动巡行现在不再是单纯的“走熟了就能一键跑”，而是会被季节变体、未兑现传闻和同伴合同真实阻塞，并把阻塞原因直接显示在路线卡上。
- 第一版同伴远行合同已经接入现有配偶 / 知己 / 帮手关系层：每条路线可挂 1 份同行合同，结算后会写入见闻册并回流关系推进。
- 收藏页已补进“见闻册”分区，远征结算、传闻兑现、季节变体首次发现和同伴合同结果都会沉淀为可回看的见闻条目与留影卡。

### 本次重点

- 行旅图开始从“点一次直接结算”的骨架版，升级为真正带有**途中推进、扎营、撤退、回城收束**的多阶段远征系统。
- 路线远征和区域首领现在都能进入同一套远征会话：先整装出发，再逐段推进，过程中会受生命、士气、风险、视野、补给和负重共同影响。
- 当前工作区已经补上第一版旅程日志、最近远征记录和旧档兼容存档结构，行旅图终于不再只是一个“换皮按钮页”。

### 已完成的玩家可感知变化

- 行旅图页新增 **远征筹备面板**，出发前可以手动选择推进风格：
  - 稳健推进
  - 侦察优先
  - 激进搜刮
- 远征还新增了可选的 **撤退规则**，例如低血撤离、满载撤离、扎营后收束等，不再只能硬着头皮点到底。
- 以前点击路线或首领后会立刻扣体力、立刻发奖励、立刻结束；现在会真正进入一段“进行中的远征”，玩家可以在途中继续推进、扎营整备、主动撤退，或者等抵达收束点后再统一结算。
- 远征过程中会显示更完整的状态信息，包括生命、士气、风险、视野、负重、发现、口粮、药剂和器具，不再只有一条抽象的“已完成”。
- 行旅图页现在已经会展示 **旅程日志**，把每一段推进、补给消耗、途中受伤、扎营恢复、撤离与收束都记录下来，让探索过程终于有了可回看的过程感。
- 新增 **最近远征记录** 面板。最近几次凯旋、撤退或失利的摘要都会被保留下来，不再是结算弹窗一关就彻底消失。
- 区域首领也已切换到多阶段远征模式：现在不是按一下就瞬间打完，而是要先逼近前线、推进数段、在状态允许时再完成最终收束。
- 行旅图的进行中远征现在还会冒出 **途中遭遇**：推进到关键路段后，可能出现前线险段、遗落收获、路途中转、首领决战前夜，或直接把本周区域事件卷进这趟旅程里。
- 新遭遇不再是单纯弹一条提示，而是会要求玩家在 **谨慎处理 / 顺势推进 / 强势介入** 三种做法之间现场判断，收益、风险、补给与负重也会因此出现分化。
- 多次走同一路线后，现在还会逐步形成 **路标渐明 -> 捷径已立 -> 熟路** 三段熟路状态；熟路不仅是标签，会真实减少推进段数，并带来额外视野、风险缓冲和起始补给优势。
- 行旅图路线卡和进行中远征面板现在会直接告诉你一条路有没有形成捷径、能少走几段、能多拿哪些开局优势，不再只能从日志和结算文案里猜自己有没有把这条路真正走熟。
- 远征结算现在开始朝“旅后处理”升级：收束后不再只是塞一组文本提示，而会拆成 **旅程回顾 / 回流分发 / 旅后处理** 三段，让你更清楚这趟路到底发生了什么、带回了什么、接下来该去哪里交差。
- 行旅图页还新增了常驻的 **旅后分发** 摘要卡。最近一次回城后，页面会直接告诉你本趟旅程的回流重点和建议去向，并提供跳去任务板、商圈、瀚海、鱼塘、博物馆、公会、村庄或钱包的承接按钮。
- 最近远征记录现在也能随时重新打开 **旅后处理**。就算当时已经关掉结算，之后也能回看这趟旅程的回流重点和承接去向。
- 荒道、泽地、高地三大区域的回城提示也变得更具体了：现在会直接把这趟旅程拆成 **资源去向 / 推荐动作 / 为什么现在去** 三层说明，不再只是泛泛地提示“可以去别的系统看看”。
- 旅后处理现在还会补一层更接近“回城办事单”的回执：会分开提示这趟旅程回来后该先去哪里 **交差**、哪里 **变现**、以及又 **解锁了哪些后续动作**。
- 行旅图区域面板不再只有“路线卡片列表”了：现在每个区域都会先展开一张更像 **卷轴路网** 的规划板，把主线、支线、深层、首领方向和营地位摆在同一张图里，出发前就能先看清这一趟大概要往哪推。
- 这张路网还接上了第一版 **迷雾显形**：节点现在会按 **未知 / 已听说 / 已勘明 / 熟路** 逐步露出信息。认知越高，显示出来的路线说明、风险提示和成本细节就越完整，不再只是看着数字自己脑补。
- 旅后处理页现在也会把这趟远征的 **推进 / 扎营 / 撤退 / 收束** 过程一起记下来，并额外标出本次回城后已经被激活的承接系统，让“回城之后先干什么”变得更清楚。
- 进行中的远征现在不再只有一个“推进一段”按钮了：每一轮都会先亮出 **下一节点选择**，你可以决定继续压正线、转向支线侧探，还是改走更深的危险节点，再决定要不要扎营或返程。
- 扎营也从“按一下回血”变成了真正的 **前线营地**：搭起营地后，会先出现夜间局势提示，然后再由你选择休整伤势、整理补给、标记路线或观察侦察中的一项，让营地终于变成前线决策点。
- 行旅图摘要区现在也会一起读这些新状态了：除了本周焦点和库存，还会额外提醒你 **上次回城结果、当前节点、下一步可选方向，以及当前最该警惕的风险**，不再像旧版那样只是一块静态提示条。
- 途中遭遇现在开始真正长成 **事件链**：除了险段、收获、旅者和首领前夜，还补进了支援与异变两类分支；每次处理后的选择会留下留痕，并推高下一次更可能出现的后续分支。
- 进行中的远征面板现在会直接展示 **前线准备、天气、污染、警戒、异变、携带层和事件链留痕**，不再只有基础数值，让“现在为什么该继续推、扎营还是撤退”变得更直观。
- 途中收获现在也不再只是抽象负重数字：远征会按资源 / 线索 / 精炼 / 补给几类真正生成携带物，扎营时还能把一部分高压收获压缩整理，负重终于开始体现“带什么回城”的取舍。
- 首领远征的终点也更像真正的终点战了：最后决战会读取你一路上的节点选择、营地准备、支援链、异变压力和前线准备度，不再只是走满步数后套一层固定结算。
- 行旅图现在还开始记住 **节点足迹、营地档案和捷径档位**：同一条路走得越深、营地处理得越稳，后续出发时就越容易继承视野、补给和前线准备，不再每次都像一张白纸重开。
- 对已经彻底走熟的路线，现在会直接开放 **自动巡行**。老路线可以一键稳定回收，新路线则继续保留手动规划、途中推进和扎营判断的探索节奏。

### 已完成的系统接线

- 行旅图存档结构现已新增远征会话、旅程日志和远征历史，旧档读取时会自动做安全回退，不会因为缺少新字段直接损坏。
- 路线远征与首领远征现在共用同一套会话状态机，统一支持：出发、推进、扎营、撤退、失败、回城结算。
- 首领远征现在也会把失败建议路线、保底资源、回退摘要一起纳入新会话链，不再和普通路线走完全不同的临时逻辑。
- 行旅图摘要区会继续识别当前进行中的远征与最近的首领结果，旧的周焦点、资源台账和跨系统承接没有被这轮重构打断。
- 本周区域事件池已经开始并入远征会话：部分周事件不会再只作为独立按钮出现，而会在远征推进中转化为“途中遭遇”，并把处理结果直接写回本周事件完成度、暂存收获和旅程日志。
- 行旅图现在开始记录 **区域情报 / 地图勘明 / 路线熟悉度**：每次推进、扎营、处理中途遭遇、事件收束或首领凯旋，都会让这张地图越来越“被走熟”。
- 已经积累出的认知不只是展示数字：再出发时会反过来改善初始视野、降低部分前线压力，并让补给回滚路线更偏向那些你真正走熟了的路。
- 这一轮又把 `journeyHistory` 和远征会话继续补厚：旅后处理、归档台账和旧档兼容现在都能稳定携带事件链留痕、途中携带物与扩展后的风险状态，不会在读档后把这些新层次丢掉。
- 当前工作区又继续把行旅图内部状态按 **长期 Meta / 单次 Session / 旅后 Settlement** 三层收口，后续再往同伴远行、季节版图和传闻网络扩展时，底层状态已经比最初那版更能接得住。

### 当前阶段说明

- 这一轮完成的是“深度探索化”的第一版核心循环 + 第二阶段途中遭遇雏形：已经把远征从一键结算改成多阶段流程，并开始把事件真正塞进旅程中途处理，而不只是停留在区域列表按钮。
- 当前最新一轮已经把“地图认知层”接上：区域卡与路线卡会直接显示情报等级、勘明进度和熟路状态，行旅图开始从“能推进的远征面板”继续往“会记住你走过哪里”的探索系统迈进。
- 在这层基础上，当前工作区又继续把“熟路”做成了真正会反向改变路线体验的长期收益：只要把同一路线走熟，后续再出发就能更快切入正线，而不再每次都像第一次一样从零摸图。
- 现在又进一步迈出了一步：回城结算开始不再只是“结算弹窗”，而是初步长成了旅后处理界面。虽然离完整的卷轴行记页还差一大截，但至少已经开始把“探索结束后怎么分发成果、接到旧系统里”这件事做成可见流程。
- 这一轮又把旅后承接再往前推了一层：不同区域回城后，会更明确地告诉你资源先流向哪里、建议先去哪个旧系统、为什么现在就该去处理，不再只是给一排通用跳转按钮。
- 现在又补上了更明确的“回城办事回执”：旅后处理会开始按交差、变现、解锁后续三类结果来组织信息，让回城后的第一步不再只是读说明，而是更像拿到一张可执行清单。
- 这一轮又把地图本体往前推了一大步：区域不再只是静态列表，而是开始拥有卷轴式主舞台、迷雾层和节点显形逻辑，行旅图终于开始长出“规划旅程”而不是“点按钮结算”的味道。
- 现在又继续把远征过程往“真的在走一趟旅程”推进了一层：进行中远征会按节点推进，日志和旅后处理也会把你这一趟实际走过的节点与营地动作一起记下来。
- 当前中优先级的“事件链 / 携带层 / 风险层 / 首领终点化”以及 4.x 里的结构层补强已经补到第一版可玩落地；下一步更适合继续攻同伴远行、季节版图、地图摄影和区域传闻网络这类更高上限项。

## 2026-04-24（开发中）

### 本次重点

- 新增 **行旅图** 主入口，作为后续“新地图系统 + 远征首领战 + 区域资源家族”的统一承接层。
- 当前工作区已完成行旅图第一阶段骨架接线：入口、导航、存档、特性开关、周推荐、样例档和基础区域资源奖励都已经打通。
- 三张首发区域已经进入统一数据结构：
  - 古驿荒道
  - 蜃潮泽地
  - 云岚高地

### 已完成的玩家可感知变化

- 游戏内已存在新的 `行旅图` 页面入口，并能显示三张区域的主题、路线数量、首领摘要和资源家族台账。
- 行旅图已接入现有页签导航，不会替换农场、矿洞、瀚海等旧页面，而是作为新的中后期区域层补进来。
- 行旅图已接入周推荐链路：当前的任务页、邮箱、目标规划和部分后期系统推荐，已经可以感知“本周区域焦点”。
- 已补入第一批区域资源实体物品，后续可以直接被任务、图鉴、博物馆、商店和活动继续承接，不再只是抽象状态。
- 行旅图现在已经具备最小的公开可玩动作：玩家可以实际执行一轮“区域巡行”，消耗体力和时间，换取区域资源与路线推进；同时也能把区域资源真实交付出去，而不是只看静态占位页。
- 行旅图现在还支持公开的区域首领挑战。只要先完成该区域至少一条路线，就能真正挑战对应首领、消耗体力与时间，并拿到区域首领奖励。
- 古驿荒道和蜃潮泽地各自继续补进了第三个重节点：前者补上“护送风险线”，后者补上“生态异常线”，路线不再是一眼见底的双节点占位，而是会随着区域推进逐步打开。
- 云岚高地也补进了第三个重节点“前哨补给线”，现在高地已经能把巡路、采晶、补给和首领准备连成完整闭环，不再只是公会后期的一段抽象过渡。
- 行旅图路线卡片现在会直接显示节点类型、体力/耗时、承接提示，以及当前为什么还不能执行这条路线；锁定区域则会先给出解锁向导，不会过早剧透后续承接。
- 行旅图现在不再依赖隐藏的开发者总开关。普通玩家就算还没正式开放该系统，也可以先点进去查看当前解锁条件，而不是只看到一句“未开启”。
- 只要你的存档已经满足对应区域的玩家进度条件，进入行旅图页时就会自动刷新解锁状态并开放可玩内容，不需要额外去调试页手动开功能。
- 商圈和鱼塘现在会在“本周焦点仍在该区域”或“区域资源库存还没消化完”时主动弹出承接卡片，并能直接把你送去任务板、瀚海、博物馆、邮箱等下游入口，而不是只把你再弹回行旅图。
- 公会、村庄建设和钱袋页现在也会接住云岚高地的高阶承接：你能直接看到高地战备、建设前置和首领准备该往哪里继续推，而不是只在行旅图页里读说明。
- 任务页、邮箱和顶部目标里的本周推荐，现在会更明确地说明“为什么去某片区域、出发前先准备什么、回来该交给谁”，区域推荐终于像一份可执行周计划，而不只是一个入口提示。
- 区域周推荐现在会跟着主题周真正点名到具体路线，不再出现“本周焦点高亮的是一组路线，但周计划却把你推去别的路线”的错位。
- 云岚高地的承接链现在已经能在浏览器里直接点穿：从公会去村庄建设，再从村庄建设继续去钱袋准备，不再卡在中间页。

### 已完成的系统接线

- 路由、导航和地图入口已接好，`region-map` 可作为正式页面访问。
- `frontier` 地点分组已加入旅行系统，读档后也能正确恢复到行旅图页。
- 存档现在已包含 `regionMap` 状态块，旧档缺失该字段时会自动回退到安全默认值。
- 行旅图已接入主题周和周计划的推荐逻辑，新的区域指标也能进入现有周目标度量体系。
- 调试样例档里已经新增行旅图综合样例，可直接从调试页跳转验证行旅图状态。
- 瀚海和博物馆现在不只会“知道本周焦点在哪个区域”，还会识别当前区域库存和路线推进，给出更贴近古驿荒道 / 蜃潮泽地节奏的承接建议。

### 审查后已收口的问题

- 修正了一个高风险问题：正式 `region-map` 页面里原本暴露的开发态强操作已被收回到 `DEV` 环境，不会在正常游玩中直接篡改进度、奖励或周目标状态。
- 修正了区域资源交付逻辑：资源交付现在会真实消耗区域资源台账，不再只是增加 telemetry。
- 修正了子开关未生效的问题：`lateGameExpeditionBoss` 和 `lateGameRegionalResources` 现已真正参与运行时判定，不会只靠主开关一起放行。
- 额外补上了首领结算前的区域解锁校验，避免未解锁区域直接写入首领清关状态。
- `Guild / Hanhai / Museum` 的推荐动作现已能识别行旅图焦点区域，老系统开始自然“认出”新区域，而不是完全依赖行旅图页面自说自话。
- 修正了“巡行后一直被判定为进行中的远征”问题，行旅图巡行完成后不会再长时间污染周推荐和大厅节奏。
- 修正了周焦点可能提前指向未解锁区域的问题，当前只会给玩家推荐已经真正开放的区域。
- 修正了行旅图仍受隐藏总开关拦截的问题：现在页面是否可用只看玩家进度条件，不再要求额外启用开发开关。
- 修正了行旅图入口前的拦路体验：未开放时也能正常进入页面查看解锁说明，已满足条件的存档会在进入时立即转成可玩状态。
- 修正了新加承接卡片“做完一次就常驻不退”的问题：现在只有在本周仍聚焦该区域，或这批区域资源还没消化完时，旧系统页才会继续提醒你承接。
- 修正了开发态结算按钮和正式可玩规则不一致的问题：开发环境下的“完成并结算 / 首领清关”也会尊重体力、背包、时间和开放条件，不再出现页面说不能打、按钮却还能强结算的错位。
- 修正了“当前远征”状态可能同时挂着路线和首领的问题：旧样例档与读档恢复现在会自动收束到有效的单一远征记录，避免当前远征摘要失真。
- 修正了首领奖励依赖路线顺序推断的问题：区域首领奖励现在会按首领自己的配置发放资源家族，不会因为后续扩路线或调顺序而发错账本。
- “当前远征”面板现在会对正式玩家开放“收束当前远征”按钮，出现异常远征残留时不再只能依赖开发态清理。
- 修正了高地承接卡会把已经做完的建设继续当成“当前可接”的问题，相关卡片现在只会提示还真的能继续推进的建设项。

### 当前验证结果

- 已通过 `npm run type-check`
- 已通过 `npm run build`
- 已通过行旅图 / 商圈 / 鱼塘 / 公会 / 钱袋五段浏览器 smoke
- 已在当前工作区用 subagent 做过两轮定向审查，并按返回问题完成收口。

### 当前阶段说明

- 这一轮完成的是“7 天冲刺版”的主骨架和第一批跨系统接线，不是三张区域的全部重内容终稿。
- 目前最适合继续推进的方向，是在现有骨架上继续补三地区的真实事件链、首领阶段玩法和更完整的旧系统 handoff。

## 版本里经常提到的玩法

- **鱼塘**：偏中期的养殖经营线。除了钓鱼赚钱，还可以养鱼、繁殖、做展示池、参加周赛和承接更高阶的交付目标。
- **育种**：偏中后期的长期研究玩法。核心是谱系、杂交、认证、品鉴和追求更稀有、更高价值的成果。
- **博物馆**：长期收藏与展陈线。你可以通过捐赠、展陈、馆务推进和学者委托，慢慢把收集成果变成稳定目标。
- **瀚海**：高阶段的异域经营与探索线，包含商路投资、遗迹勘探、轮换商品，以及更特殊的后期玩法。
- **交流大厅 / 邮箱 / AI 助手**：独立版在线功能。大厅偏社区交流，邮箱负责奖励、补偿和系统通知，AI 助手更像游戏内置帮助与问答入口。

## 2026-04-23

### 本次重点

- 中后期内容继续扩展，鱼塘、育种、博物馆、隐藏 NPC、瀚海和任务系统补进了更多目标、事件和成长路线，后期不再只是单纯刷钱，而是有更明确的推进方向。
- 鱼塘线继续往“独立经营玩法”推进。它现在不只是钓鱼后的附属系统，而是逐渐形成了养殖、展示、周赛、交付和图鉴相互联动的一整条经营线。
- 育种线继续加强。围绕谱系、杂交、认证和品鉴的长期养成感更明显，适合喜欢慢慢打磨成果、追求高价值品系的玩家。
- 博物馆和学者委托继续补强，收藏与展陈不再只是单次捐赠，而是逐渐变成有长期目标感的收集玩法。
- 瀚海内容继续扩展。作为偏后期的异域经营线，它承担的是“更远的商路、更高阶的探索、更多异域目标”的体验，本轮继续朝这个方向补内容。

### 在线与版本支持

- 独立版在线部分继续完善，交流大厅、邮件、AI 助手和管理入口的联动更完整，长期运营内容开始更有持续更新产品的味道。
- Android 版本准备工作已经接入，后续移动端打包和发布会更顺畅，也意味着独立版后面更容易往多端延伸。

### 体验与修复

- 修复了一批影响构建和实际游玩的 bug，重点覆盖存档读写、NPC 事件、瀚海流程、主菜单和大厅联动。
- 一些后期系统的入口、目标承接和反馈表现继续理顺，玩家更容易知道“这条玩法现在该往哪里推”。

## 2026-04-21

### 本次重点

- 新增官方控制平台与后台管理工具，方便统一处理配置、活动和运营内容。
- 主菜单与管理台结构更新，独立版常用入口更集中，后台操作也更直观。
- 目标面板、引导和后期测试内容继续补强，为后续活动更新和版本维护打下基础。

### 对玩家的意义

- 如果你主要体验公开部署版或带在线功能的版本，这次更新让活动、公告和运营内容更容易持续维护，后续版本的更新节奏会更稳定。
- 主菜单和目标承接更清楚后，玩家在进入游戏、找入口、看当前目标时会更省力，不容易出现“系统很多，但不知道先看哪里”的感觉。

## 2026-04-20

### 本次重点

- 完成 Beta 测试版准备，补充了更多后期样例存档与验证内容，很多长线流程更容易被测试和回归。
- 首页内容管理、AI 助手、邮件、大厅和存档链路继续加强，为公开部署和长期测试环境做准备。
- 多项旧档兼容与玩法稳定性问题进入集中收口，减少更新后老存档不好用、或者系统明明存在却接不上流程的情况。

### 玩法相关说明

- 这一阶段的重点不是单独新增某一个大系统，而是把已经铺开的中后期内容进一步做稳。
- 对玩家来说，这意味着鱼塘、育种、关系、任务、预算、收集这些成长线之间的承接会更自然，旧档继续玩时也更不容易出问题。

## 2026-04-18

### 本次重点

- 加入热更新能力，后续修复可以更快触达，不需要每次都依赖完整大版本重新分发。
- 服务端存档改进为“本地先保底，恢复后自动同步”，在线游玩时即使遇到短时异常，也更不容易丢失进度。
- 图鉴、百科、比赛与预算等基础资料进一步完善，查资料、定路线和规划中后期目标会更方便。

### 玩法与体验更新

- 限时任务窗口改成按真实剩余天数收束，并真正参与高阶订单生成，主题周和活动周的紧迫感会更真实，接单体验也更贴近当前周主题。
- 瀚海的德州和恶魔轮盘等长局玩法会在进行中正确暂停游戏时钟，避免一局还没打完就被跨日结算打断。
- 鱼塘高阶订单、展示与相关评分表现继续补强，交付结果更贴近你实际拿去提交的鱼，而不是只看表面门槛。
- `anglers_token`、`chefs_hat` 这类解锁条件改为按“实际钓到过的鱼种”“实际做过的不同菜谱”计算，成就与进度更符合直觉。
- AI 助手稳定性继续提升，连续发送、回车发送和配置读取异常的问题进一步收口。

### 修复与优化

- 修复了钓鱼、工坊免费配方、批量购买、邮箱领奖、额度兑换、图鉴记录、商店校验和多页面切换残留态等一批高频问题。
- 服务端存档、交流大厅、邮箱和额度兑换统一接入更稳的在线恢复逻辑，断线、短时异常或服务重启后的恢复体验更好。
- 一些旧档迁移、背包容量判断、奖励领取提示和活动状态显示问题被继续修正，整体体验更顺滑。

## 2026-04-16

### 本次重点

- 更新新手指南、系统百科与主菜单引导，开局路线和系统入口更清晰。
- 后台与管理流程同步刷新，公告、资料和管理页的使用体验更统一。
- 鱼塘、公会、瀚海、任务、商店和角色关系等模块继续优化，整体节奏更顺手。

### 对新玩家更友好的地方

- 如果你刚开始玩，这次更新最大的意义是“更容易知道该做什么”。主菜单、引导页和系统百科都更强调路线感，不会一上来被太多系统淹没。
- 对已经进入中期的玩家来说，鱼塘、公会、瀚海、任务和关系线的入口更清楚，切换玩法时更容易找到承接点。

## 最初的更新记录

说明：下面这些内容补录自旧版 `taoyuan-main/CHANGELOG.md`，主要收录新版总览里还没单独展开的早期与补充更新。

### 2026-04-11

- 中后期经济线开始成型，市场轮换、周预算、钱包流派、商店推荐和村庄建设之间的联动被正式接起来，赚钱、消耗和成长不再各自割裂。
- 瀚海的商路经营和异域商品体系大幅扩展，后期除了田庄循环，还能逐渐转向异域贸易、路线投资和更高阶的经营玩法。
- 目标面板、任务、博物馆、公会和商店承接开始更紧密，周推进不再只是机械过天，而是更像一套能规划节奏的长期经营循环。

### 2026-04-12

- 后期审查与 QA 覆盖开始系统化，围绕坏档、回滚、灰度、补偿、兼容和发布门禁建立了一整套治理思路，后期版本开始有更明确的自检与回归框架。
- 家庭心愿、知己协作、村庄捐献、活动邮件、学者委托等多条长线玩法开始补成真实闭环，不再只是展示状态或半成品入口。
- 项目内增加了后期样例存档 QA、治理面板和更完整的引导覆盖，鱼塘、公会、瀚海、NPC 等后期页面更容易被统一排查与验证。

### 2026-04-14

- 服务端存档权威链路被重新收紧，读取、领奖、热刷新和额度兑换都开始更严格地绑定当前真实存档，减少“奖励到账了但落错档”这类风险。
- 瀚海扑克结算从宽松模式改成更可校验的结算链路，长局玩法的公平性和可追溯性明显加强。
- 一批与成就、烹饪、样例档和安全校验相关的底层问题同步收口，为后面几天的大量玩法扩展打了更稳的基础。

### 2026-04-15

- 同性婚姻与领养家庭线完成一轮较完整落地，关系发展、婚缘互斥、家庭扩展、文案表现和旧档兼容都补得更细，角色关系玩法更完整。
- 后台新增“关于游戏”内容编辑、长期日志中心和更完整的管理台，首页介绍、版本说明和长期运营记录开始有更稳定的维护入口。
- 图鉴和百科从“资料堆叠”升级为更偏问题导向的查询体验，玩家更容易从“我想知道这个东西怎么获得、有什么用”直接找到答案。
- 引导面板、路线按钮、目标 CTA 和移动端邮箱交互也做了明显整理，整体更像一个已经准备长期维护的独立版产品。

### 2026-04-16 补记

- 鱼塘展示池、鱼基因、公会周快照和瀚海商路 / 遗迹这些细节规则在这一天继续收口，很多中后期系统开始从“能玩”往“规则更稳定”推进。
- 一些旧档兼容和周切换统计口径被进一步修正，长期游玩时的读档、周结算和成长记录更可靠。

### 2026-04-17

- 仙灵“传闻 / 邂逅 / 显现”相关剧情弹层做过一次重要修复，长文本和多段场景切换时更稳定，不容易再出现按钮被挤没或弹层像关不掉的情况。

### 2026-04-18 补记

- 除了前面总览里提到的热更新和存档恢复，这一天还集中修了很多日常高频体验问题，例如身份补录、设置弹窗残留暂停、隐藏 NPC 时间推进、背包判定、装备附魔、酒窖取物和天气 / 旅行口径等。
- 博物馆跨周领奖、鱼塘图鉴回填、公会赛季基线、瀚海长局快照、料理 buff 文案、采集与钓鱼失败反馈等细节也在这轮继续补齐，很多“玩着总觉得哪里不顺”的边角体验被一并收口。

### 2026-05-10

- 时历终于不再只是“看哪天有节日”，而是能同时给出今日事件、近期准备、稀有来访和长线提醒，玩家会更自然地为了生日、节前备货和天气窗口提前安排日程。
- 新增了书商与稀有来访的第一轮骨架，像行脚书生、节庆商人、巡回艺人、异乡客这类低频角色已经被正式接入日历和邮件提醒，商圈里也能在来访当天直接逛“游学书肆”。
- 增补了 1 到 3 天的小型季节活动窗口，并让第二年起的节日开始随村庄建设、关系状态和主题周发生变化，旅行商人的货架也会更看季节、节庆和修复进度。
- 村民送礼不再是一眼查表。现在礼物偏好需要通过对话、节庆观察、秘密纸条和亲自送礼慢慢摸清，NPC 页也会把“模糊线索 / 明确偏好 / 已验证”分开记录。
- 生日报酬从单纯倍率提升成了更有存在感的关系节点：送对礼物时会有更明确的感谢、额外推进和可回看的生日线索，礼物玩法终于开始像“认识一个人”而不是“背一个答案”。
- 百科里的村民条目也收起了直接剧透的最爱 / 喜好 / 讨厌列表，改成引导玩家自己观察、记录和验证，整体关系体验更接近生活模拟而不是资料库。

### 2026-05-11

- WS08 的新住户第一版也已经接进村庄生活层：当前覆盖商队定居、学者驻村、山灵化人三条引入线，并且会把新货架、新对话群、新线索池和节庆回响一起带进村里。
- 商圈总览和村庄总览现在都会承认这些住户的存在。完成商队驿站扩建、做过雪琴的特殊订单、或与隐世灵体结下羁绊后，玩家可以直接看到对应的驻村回响与货架承接。
- 行旅图开始真正像“活地图”了。现在会在同一层信号里一起提示季节变体、稀有来访、节庆装点、短活动窗口、修复设施落点和新摊位落点，不用再分散翻好几个页面才知道今天村里和远路上发生了什么。
- 新手教程和百科入口也顺手补上了这条认知链：现在会明确提醒玩家“今天值不值得看地图”，并把任务板、主题周、行旅图之间的关系说得更直白，减少中期系统变多后不知道先看哪的割裂感。

- 秘密纸条不再只是“收集后直接领钱领物”。现在第一批纸条已经被拆成礼物线索、藏宝线索、地点谜题、世界传闻、人物秘闻五类，并且会在笔记页里明确显示待验证、可验证、已验证状态。
- 至少十张纸条已经接成了真正的“线索 -> 验证 -> 记录 -> 回报”闭环。玩家需要去对的地点、季节、天气、时段、节日或建设进度下自己核对，成功后才会拿到宝藏或把见闻写实。
- 纸条掉落来源也从原来的少数入口扩到挖矿、钓鱼、挖地、伐木、采集、怪物与特殊资源点，隐藏仙灵前置信号也开始通过纸条先一步埋进世界里，探索终于更像在追一条线，而不是开一个奖励盒。
- 委托板也开始更像“村里每天在传什么”。新增了一批更短、更口语化的传闻轻任务，来源会带上村口流言、鱼汛口风、节前风声、商路异动这类味道，同时 Quest 页开始保留近期已完成订单，方便回看是谁托过你什么事。
## 2026-05-15锛堝紑鍙戜腑锛?
- 睡觉后的信息现在先收口成日结摘要，再进入记录中心，不会再一上来刷一屏同类 toast。
- 原来的“日志”入口已经升级成“记录中心”，并把内容拆成 `日结 / 见闻 / 线索 / 系统` 四类，长期记录不再和系统流水混在一起。
- 夜间结算里的异常、失败和背包不足也被单独收进摘要的风险区，系统消息仍保留，但不会继续洪泛。
