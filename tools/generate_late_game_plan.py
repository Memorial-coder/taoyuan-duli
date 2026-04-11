from pathlib import Path


OUT_PATH = Path("taoyuan-main/后期经济治理与中后期循环扩展AI实施方案-2026-04-10.md")


STREAMS = [
    {
        "id": "WS01",
        "name": "经济观测与通胀治理底座",
        "goal": "先建立后期经济监控、通胀识别、消耗池追踪、玩家资产分层和调参抓手，再做新增内容，避免继续用拍脑袋方式调数值。",
        "store": "src/stores/usePlayerStore.ts",
        "data": "src/data/market.ts、src/data/goals.ts",
        "view": "src/views/game/WalletView.vue、src/views/game/ShopView.vue",
        "scheduler": "src/composables/useEndDay.ts",
        "links": "useShopStore.ts、useGoalStore.ts、useQuestStore.ts、useAchievementStore.ts",
        "server": "无强依赖，可选接 taoyuanMailbox 活动补偿",
        "feature": "资产分层、流入流出分类、通胀指数、消耗满意度、后期危险预警",
        "kpi": "后期资产分位、7日净流入、日均消耗率、单系统收入占比",
        "risks": "不要直接削弱玩家已获得资产，要优先通过新 sink、价格带、维护费和主题消费引导回收。",
    },
    {
        "id": "WS02",
        "name": "村庄建设终局资金池 2.0",
        "goal": "把现有村庄建设从中期功能解锁升级成后期高价长期投入与跨系统共同目标，让巨额铜钱有体面的长期去向。",
        "store": "src/stores/useVillageProjectStore.ts",
        "data": "src/data/villageProjects.ts",
        "view": "src/views/game/HomeView.vue、src/views/game/QuestView.vue",
        "scheduler": "src/composables/useEndDay.ts",
        "links": "useQuestStore.ts、useGoalStore.ts、useMuseumStore.ts、useGuildStore.ts、useHanhaiStore.ts",
        "server": "可选接 server/src/taoyuanMailbox.js 做全服共建奖励",
        "feature": "高价建设、阶段建设、维护需求、捐赠型项目、区域功能变化",
        "kpi": "高价项目完成率、后期玩家建设参与率、村庄等级分布、项目材料回收量",
        "risks": "建设不能只给数值，要改变订单池、主题周、展示空间、任务容量或新玩法入口。",
    },
    {
        "id": "WS03",
        "name": "商店目录与豪华消费池扩容",
        "goal": "在商店目录、周精选、豪华许可、功能型服务和收藏型消费上增加多层价格带，形成稳定但不粗暴的后期铜钱回收。",
        "store": "src/stores/useShopStore.ts",
        "data": "src/data/shopCatalog.ts、src/data/wallet.ts",
        "view": "src/views/game/ShopView.vue、src/views/game/WalletView.vue",
        "scheduler": "src/composables/useEndDay.ts",
        "links": "useInventoryStore.ts、useWarehouseStore.ts、useHomeStore.ts、useDecorationStore.ts",
        "server": "无强依赖",
        "feature": "豪华许可证、仓储服务、远行补给、节庆礼盒、展示型家具、功能型券包",
        "kpi": "豪华商品购买率、周精选转化率、重复购买率、功能道具沉没率",
        "risks": "不要把商店做成纯氪金错觉，所有高价消费都要有世界观解释和体验反馈。",
    },
    {
        "id": "WS04",
        "name": "市场行情与动态通胀抑制",
        "goal": "通过市场热点、过剩惩罚、主题奖励、区域需求和周度行情轮换，减少玩家只刷单一赚钱路径的动机。",
        "store": "src/stores/useShopStore.ts",
        "data": "src/data/market.ts、src/data/goals.ts、src/data/shopCatalog.ts",
        "view": "src/views/game/ShopView.vue、src/components/game/TopGoalsPanel.vue",
        "scheduler": "src/composables/useEndDay.ts",
        "links": "useFarmStore.ts、useFishingStore.ts、useProcessingStore.ts、useQuestStore.ts",
        "server": "可选用 mailbox 推送行情通告",
        "feature": "热点品类、冷却期、地区收购、超量惩罚、主题鼓励、替代奖励",
        "kpi": "单一卖货占比、热点参与率、价格波动接受度、多系统收入平衡度",
        "risks": "过剩惩罚要温和且可预期，不能让玩家感觉库存瞬间作废。",
    },
    {
        "id": "WS05",
        "name": "育种 × 特殊订单 × 主题周经营化",
        "goal": "把育种从图鉴深坑升级为高价值经营路线，让高属性、高世代、指定亲本与主题偏好的订单成为后期稳定目标。",
        "store": "src/stores/useQuestStore.ts、src/stores/useBreedingStore.ts",
        "data": "src/data/quests.ts、src/data/goals.ts",
        "view": "src/views/game/BreedingView.vue、src/views/game/QuestView.vue",
        "scheduler": "src/composables/useEndDay.ts",
        "links": "useGoalStore.ts、useFishPondStore.ts、useShopStore.ts、useVillageProjectStore.ts",
        "server": "可选用 mailbox 推送育种交流会奖励",
        "feature": "高甜度订单、高抗性订单、世代门槛、亲本来源要求、主题周偏好、育种展示",
        "kpi": "后期育种活跃率、特殊订单完成率、育种收益占比、失败后的继续尝试率",
        "risks": "不要让订单需求完全随机，必须保证可追踪、可准备、可解释。",
    },
    {
        "id": "WS06",
        "name": "博物馆 / 祠堂持续经营线",
        "goal": "让捐赠玩法从一次性交作业转为长线经营系统，通过展陈等级、专题展、学者来访、供奉主题增益和参观收益延长生命周期。",
        "store": "src/stores/useMuseumStore.ts",
        "data": "src/data/museum.ts、src/data/goals.ts",
        "view": "src/views/game/MuseumView.vue",
        "scheduler": "src/composables/useEndDay.ts",
        "links": "useQuestStore.ts、useVillageProjectStore.ts、useNpcStore.ts、useGoalStore.ts",
        "server": "可选用 mailbox 推送专题展奖励",
        "feature": "展陈槽位、馆区等级、学者委托、供奉主题、参观流量、展示评分",
        "kpi": "捐赠后回流率、专题展参与率、博物馆带来的订单数、非战斗后期留存",
        "risks": "不要让博物馆变成第二个纯材料坑，展示与叙事反馈必须明显。",
    },
    {
        "id": "WS07",
        "name": "公会赛季化与轻竞争 PVE",
        "goal": "继续扩大 PVE，但保持轻竞争，通过赛季目标、荣誉榜、公会共建、轻排行和讨伐主题周制造长期追求。",
        "store": "src/stores/useGuildStore.ts",
        "data": "src/data/guild.ts、src/data/goals.ts",
        "view": "src/views/game/GuildView.vue",
        "scheduler": "src/composables/useEndDay.ts",
        "links": "useGoalStore.ts、useQuestStore.ts、useMiningStore.ts、useAchievementStore.ts",
        "server": "server/src/taoyuanMailbox.js、server/src/routes/api.js",
        "feature": "赛季讨伐、荣誉称号、异步排行、结算邮件、全服共建里程碑",
        "kpi": "公会周活、赛季完成率、异步榜参与率、公会商店回收量",
        "risks": "不能做实时强同步或掠夺式对抗，奖励也不能影响单机主进度公平。",
    },
    {
        "id": "WS08",
        "name": "瀚海终局循环深化",
        "goal": "把瀚海从终局开口做成终局循环，增加商路投资、遗迹套组、Boss 周期、古物收集与沙海节庆，使其成为第二主战场。",
        "store": "src/stores/useHanhaiStore.ts",
        "data": "src/data/hanhai.ts",
        "view": "src/views/game/HanhaiView.vue",
        "scheduler": "src/composables/useEndDay.ts",
        "links": "useQuestStore.ts、useShopStore.ts、useMuseumStore.ts、useGoalStore.ts",
        "server": "可选用 mailbox 推送沙海活动结算",
        "feature": "商路押运、遗迹词缀、套装古物、沙海订单、周期 Boss、投资风险",
        "kpi": "瀚海解锁后留存、遗迹复玩率、商路投资次数、瀚海材料回收量",
        "risks": "不能只是在瀚海里继续刷钱，必须设计净消耗、风险决策和跨系统出口。",
    },
    {
        "id": "WS09",
        "name": "家庭 / 配偶 / 仙灵陪伴循环",
        "goal": "给关系线后期真正的陪伴玩法，让婚后分工、家庭心愿、仙灵祝福、挚友协作和家业继承形成非战斗长线。",
        "store": "src/stores/useNpcStore.ts、src/stores/useHiddenNpcStore.ts",
        "data": "src/data/npcs.ts、src/data/hiddenNpcHeartEvents.ts、src/data/goals.ts",
        "view": "src/views/game/NpcView.vue、src/views/game/HomeView.vue",
        "scheduler": "src/composables/useEndDay.ts",
        "links": "useQuestStore.ts、useHomeStore.ts、useBreedingStore.ts、useFishingStore.ts",
        "server": "可选接邮箱发送纪念事件奖励",
        "feature": "婚后分工、孩子成长、家庭愿望、仙灵供奉、挚友联合项目",
        "kpi": "婚后玩家周活、家庭心愿完成率、非战斗后期目标覆盖度、关系系统回访率",
        "risks": "不能把配偶做成纯自动化工具人，必须有生活感、选择感和情感反馈。",
    },
    {
        "id": "WS10",
        "name": "主题周 + 活动编排 + 邮箱运营层",
        "goal": "用现有主题周、特殊订单和邮箱能力，建立 30/60/90 天可重复编排的活动层，为版本更新提供节奏。",
        "store": "src/stores/useGoalStore.ts、src/stores/useQuestStore.ts",
        "data": "src/data/goals.ts、src/data/quests.ts、src/data/shopCatalog.ts",
        "view": "src/views/game/QuestView.vue、src/views/game/MailView.vue、src/components/game/TopGoalsPanel.vue",
        "scheduler": "src/composables/useEndDay.ts",
        "links": "useShopStore.ts、useGuildStore.ts、useMuseumStore.ts、useHanhaiStore.ts",
        "server": "server/src/taoyuanMailbox.js、server/src/routes/api.js",
        "feature": "赛季主题周、限时任务、邮件说明、全服共建、结算奖励、运营模板",
        "kpi": "活动参与率、邮件打开率、活动带回流量、主题周完成率",
        "risks": "活动层只能增强主循环，不能绑架玩家每天上线打卡。",
    },
    {
        "id": "WS11",
        "name": "UI 引导、推荐系统与信息层级补强",
        "goal": "用信息层级、推荐目标、资金去向提示、风险预警和活动摘要降低后期复杂度，让玩家看懂为什么要花钱、为什么要换玩法。",
        "store": "src/stores/useGoalStore.ts、src/stores/useTutorialStore.ts",
        "data": "src/data/tutorials.ts、src/data/goals.ts",
        "view": "src/views/game/WalletView.vue、src/views/game/QuestView.vue、src/views/game/BreedingView.vue、src/views/game/MuseumView.vue、src/views/game/ShopView.vue",
        "scheduler": "src/composables/useEndDay.ts",
        "links": "useShopStore.ts、useQuestStore.ts、useBreedingStore.ts、useMuseumStore.ts",
        "server": "无强依赖",
        "feature": "后期推荐面板、通胀提示、主题周摘要、活动倒计时、成长建议",
        "kpi": "高阶页面停留时间、目标点击率、推荐任务采纳率、迷失反馈下降",
        "risks": "提示必须是帮玩家理解，而不是把界面做成公告板堆积。",
    },
    {
        "id": "WS12",
        "name": "QA、平衡、灰度、存档兼容与回滚",
        "goal": "为所有后期更新建立事务安全、存档兼容、版本配置、灰度开关、回滚方案和测试清单，避免新内容放大历史边界问题。",
        "store": "src/stores/useSaveStore.ts、src/stores/usePlayerStore.ts",
        "data": "src/data/goals.ts、src/data/quests.ts、src/data/villageProjects.ts",
        "view": "涉及全部后期页面",
        "scheduler": "src/composables/useEndDay.ts",
        "links": "useInventoryStore.ts、useMiningStore.ts、useProcessingStore.ts、useQuestStore.ts",
        "server": "server/src/taoyuanMailbox.js、server/src/routes/api.js",
        "feature": "特性开关、存档迁移、事务化结算、自动化回归、公告与补偿",
        "kpi": "坏档率、回滚触发率、任务结算错误率、发布后热修次数",
        "risks": "任何新增循环都必须先过事务边界和兼容性检查，尤其是奖励发放与日结。",
    },
]


TASK_TEMPLATES = [
    {
        "name": "基线审计与 KPI 定义",
        "goal": "梳理{feature}的现状、目标玩家、核心痛点与成功指标，输出基线口径供后续实现和调参使用。",
        "files": "{store} / {data}",
        "depends": "无",
        "impl": "基于{goal}，在需求文档中补充公式、阈值、风险等级和样本玩家分层；明确{kpi}的采集口径，并记录与{links}的关系。",
        "accept": "形成可执行的指标清单；至少定义4个核心指标、2个护栏指标、1个失败回滚条件；后续任务引用同一口径。",
        "risk": "不要只写结论，必须写公式、数据来源和异常解释规则。",
    },
    {
        "name": "数据结构与类型定义",
        "goal": "为{feature}补齐类型、配置字段、默认值与旧存档兼容约定，先锁定数据形状再开发逻辑。",
        "files": "{data} / {store}",
        "depends": "上一任务完成后开始",
        "impl": "在相关 data / type / store 中预留字段、版本号、默认配置、枚举和注释；所有新增字段都要给出缺省值、边界值和未来扩展位。",
        "accept": "旧存档读入时不报错；新字段都有默认值；配置结构能覆盖 P0、P1、P2 三个阶段。",
        "risk": "不要把临时状态写死在 view 层，也不要遗漏 serialize / deserialize。",
    },
    {
        "name": "Store 状态与 API 扩展",
        "goal": "在{store}中增加统一的读写入口、计算属性、事务函数与调试接口，避免逻辑散落在页面。",
        "files": "{store}",
        "depends": "依赖数据结构任务",
        "impl": "新增可测试的 action / getter；需要跨系统时通过 store API 暴露，不直接在 view 内拼装规则；必要时在日志中增加调试标记。",
        "accept": "页面只消费 store 暴露的结果；关键逻辑可单独调用；存档序列化完整。",
        "risk": "不得在多个页面复制公式，必须单点维护。",
    },
    {
        "name": "日结 / 周结调度接入",
        "goal": "把{feature}纳入{scheduler}的日结、周结或月结编排，使玩法具备稳定刷新节奏。",
        "files": "{scheduler} / {store}",
        "depends": "依赖 Store API 完成",
        "impl": "在 end day 编排中增加刷新、结算、过期、维护费、邮件提示或主题周切换；若是周度机制，要明确每周一刷新与跨季边界。",
        "accept": "跨天、跨周、跨季切换均能正确执行；日志、奖励和状态一致；不会吞物或重复结算。",
        "risk": "所有结算必须先校验容量、幂等和失败回滚。",
    },
    {
        "name": "内容配置首批落地",
        "goal": "为{feature}产出第一批可玩的内容表，包括项目、商品、订单、活动、馆区、词缀或奖励池。",
        "files": "{data}",
        "depends": "依赖类型与调度框架",
        "impl": "首批内容至少覆盖中期过渡、后期进阶、终局展示三档；每档都要有价格带、产出带和消耗带，不允许只有一个数值维度。",
        "accept": "首批内容足够支撑2~3个版本迭代；配置可读、可扩展、可筛选；策划后续只改 data 也能扩容。",
        "risk": "不要把所有好东西都塞进第一批，保留后续活动和赛季扩展空间。",
    },
    {
        "name": "页面入口与信息展示",
        "goal": "在{view}中补齐入口、说明、进度、消耗预览、奖励反馈和失败提示，让玩家看得懂这条后期路线。",
        "files": "{view}",
        "depends": "依赖 Store 与内容配置",
        "impl": "页面要显示需求摘要、花费拆解、收益预览、推荐理由、倒计时与风险说明；高频操作增加一键跳转相关面板。",
        "accept": "玩家能在10秒内知道要做什么、花什么、得到什么；关键失败原因可视化；移动端不拥挤。",
        "risk": "不要用长段文字堆叠说明，优先摘要卡片、chip 和结构化列表。",
    },
    {
        "name": "跨系统联动闭环",
        "goal": "把{feature}和{links}串成完整经营闭环，确保不是孤立新面板，而是能改变玩家每周决策。",
        "files": "{store} / {data} / 相关联动 store",
        "depends": "依赖前几项基础完备",
        "impl": "至少实现一种收入转消耗、一个成长转订单、一个展示转声望、一个活动转奖励的闭环；必要时补充目标面板与订单池偏置。",
        "accept": "玩家参与本线后，会反过来提升至少2条现有系统的活跃度；可从日志中看到闭环证据。",
        "risk": "不要只做额外奖励，必须让新系统改变旧系统选择。",
    },
    {
        "name": "事务安全与防刷处理",
        "goal": "针对{feature}补齐容量预检、幂等标记、失败回滚、重复领奖保护与日志一致性。",
        "files": "{store} / {scheduler}",
        "depends": "依赖联动逻辑确定",
        "impl": "参考现有复审报告的事务边界要求，先检容量再扣源物，再发奖励，再记状态；必要时引入领取记录或真实写入回执。",
        "accept": "背包满、网络中断、重复点击、跨天切换等场景不丢货、不重奖、不坏档；日志与结果一致。",
        "risk": "不能为了快而继续使用非原子 addItem 直写路径。",
    },
    {
        "name": "调参与运营开关",
        "goal": "为{feature}增加可调参数、灰度开关、权重池和运营兜底，确保上线后可热调而不是只能改代码。",
        "files": "{data} / {store} / {server}",
        "depends": "依赖首轮可玩版本",
        "impl": "把价格系数、刷新权重、奖励倍率、主题偏置、维护费、冷却时间等放入配置；若接服务器，则预留邮件和活动开关。",
        "accept": "不改业务逻辑即可调整至少8个核心参数；支持快速关闭异常活动或降低奖励。",
        "risk": "不要把关键平衡参数写死在 view 或临时变量里。",
    },
    {
        "name": "QA、数值验收与上线文档",
        "goal": "为{feature}补齐测试用例、数值验收、更新公告、回滚条件与补偿预案，形成真正可发布的交付包。",
        "files": "相关功能文件 / CHANGELOG / 方案文档",
        "depends": "依赖功能完成",
        "impl": "编写正向、反向、边界、兼容、异常恢复、活动切换、奖励发放等测试；同时给出更新公告文案、监控面板和补偿策略。",
        "accept": "每个功能至少有8个用例；上线前有验收结论；出现问题时知道如何回滚和补偿。",
        "risk": "不要把 QA 放到最后临时补，设计阶段就要写护栏指标。",
    },
]


def render(text: str, stream: dict) -> str:
    return text.format(**stream)


lines: list[str] = []


def add(text: str = "") -> None:
    lines.append(text)


add("# 桃源乡后期经济治理与中后期循环扩展 AI Implementation Plan（2026-04-10）")
add()
add("> 文档目标：把“后期货币过多、通胀、消耗池不足、玩法重复、中后期循环单一”的问题，拆成 AI 与研发都能直接执行的 implementation plan。")
add("> 适用范围：taoyuan-main 前端主工程 + server 目录中的在线辅助模块。")
add("> 文档类型：AI 可读执行方案 / 版本路线图 / 任务台账。")
add("> 对齐依据：后期玩法补充建议、PVP-PVE 建议、三次玩法逻辑复审报告、育种实施方案、UI 效率优化执行清单、现有 store/data 结构。")
add("> 目标要求：内容具体、全面、可落地；不少于 1000 行；不少于 100 个任务。")
add()
add("---")
add()
add("## 一、执行摘要")
add()
add("### 1.1 一句话结论")
add()
add("当前版本真正缺的不是“多几个功能按钮”，而是后期玩家的长期决策层。需要把大额铜钱回收、跨系统建设、周度主题、订单编排、展陈经营、瀚海终局、家庭陪伴和公会赛季化串成一个可循环、可运营、可扩展的后期结构。")
add()
add("### 1.2 本方案解决的核心问题")
add()
for item in [
    "问题 A：后期铜钱过多，通胀明显，缺少足够强的净消耗池。",
    "问题 B：玩家容易回到单一最优解循环，例如单刷矿洞、单刷卖货、单刷某一系统。",
    "问题 C：育种、瀚海、博物馆、公会、家庭、主题周等系统存在，但联动层不足。",
    "问题 D：后期目标很多，但结构增长不足，常常只是重复做以前做过的事。",
    "问题 E：新增后期内容如果不事务化与可灰度，会放大历史边界风险。",
]:
    add(f"- {item}")
add()
add("### 1.3 本方案的核心策略")
add()
for item in [
    "先做经济观测，再做通胀治理，不做盲目削收益。",
    "先做消耗池分层，再做高价内容，避免大额资金无处可去。",
    "先做跨系统闭环，再做单点扩容，避免新功能继续孤岛化。",
    "先做日结 / 周结编排，再做活动与赛季，保证节奏稳定。",
    "所有新奖励、新订单、新结算都要经过事务安全和存档兼容检查。",
]:
    add(f"- 策略：{item}")
add()
add("### 1.4 本次明确不做的事情")
add()
for item in [
    "不做实时强同步 PVP。",
    "不做掠夺、偷菜、抢资源这类破坏单机主体验的玩法。",
    "不做强行砍掉玩家既有资产的暴力通缩。",
    "不把后期复杂度全部压给玩家手动记忆，而是配套 UI 推荐与提示。",
]:
    add(f"- {item}")
add()
add("---")
add()
add("## 二、设计目标与成功标准")
add()
add("### 2.1 业务目标")
add()
for item in [
    "让后期玩家在 30 天以上游玩后仍有明确的建设、展示、订单、赛季和陪伴型目标。",
    "让高额铜钱与终局材料存在多层价格带的稳定回收路径。",
    "把现有育种、瀚海、公会、博物馆、村庄建设、家庭系统串成相互驱动的网络。",
    "建立适合独立版在线能力的轻运营层，而不是转向高压竞技。",
]:
    add(f"- {item}")
add()
add("### 2.2 技术目标")
add()
for item in [
    "新增后期逻辑优先落在 Pinia store、data 配置和 useEndDay 编排中，不把核心规则写死在 view。",
    "新增字段必须兼容旧存档，具备默认值、版本号和迁移策略。",
    "所有新奖励发放、扣费、维护费、订单结算都要具备事务边界。",
    "主要平衡参数可通过配置调整，必要时可通过邮箱活动与服务器开关兜底。",
]:
    add(f"- {item}")
add()
add("### 2.3 关键成功指标")
add()
for item in [
    "后期玩家 7 日净流入 / 总资产比下降到可控区间。",
    "后期玩家 7 日内参与的不同系统数提升到至少 4 个。",
    "高价项目、豪华商品、赛季内容、博物馆专题展至少有两类成为常用 sink。",
    "特殊订单完成率保持在健康区间，失败率高时能通过 UI 推荐和活动偏置修正。",
    "新增内容上线后，坏档率、吞货率、重复领奖率不高于现有标准。",
]:
    add(f"- {item}")
add()
add("### 2.4 失败判定与回滚条件")
add()
for item in [
    "若任一版本导致后期玩家平均日收益下降过快且无替代乐趣增长，则暂停继续扩散惩罚机制。",
    "若任一新系统的净消耗低于预期且玩家感知为鸡肋，则优先补反馈与价值，不急于加码价格。",
    "若任一活动层出现领奖重复、吞物或存档异常，则立即关闭对应活动开关并发补偿邮件。",
]:
    add(f"- {item}")
add()
add("---")
add()
add("## 三、问题矩阵与设计原则")
add()
add("### 3.1 当前问题矩阵")
add()
add("| 问题 | 当前表现 | 根因 | 本方案对应解法 |")
add("|---|---|---|---|")
matrix_rows = [
    ("后期铜钱过多", "钱只在少数地方花，且价格带偏低", "缺大额 sink、缺周度消费、缺维护需求", "村庄建设 2.0、豪华目录、商路投资、展陈维护"),
    ("玩法重复", "玩家回到单一最优收益循环", "缺动态行情、缺主题偏置、缺跨系统联动", "行情系统、主题周、特殊订单扩容、赛季任务"),
    ("育种后期孤立", "深度够，但经营出口不足", "缺订单、市场、展示、建设前置", "育种主题订单、村庄建设材料、展示赛"),
    ("博物馆一次性交作业", "捐完就结束", "缺展陈等级、缺经营反馈", "专题展、学者来访、参观收益、祠堂主题供奉"),
    ("瀚海只是开口", "解锁后循环浅", "缺投资风险、缺遗迹深度、缺周期挑战", "商路投资、套组古物、Boss 周期与沙海节庆"),
    ("关系线后期弱", "婚后奖励消耗快", "缺陪伴玩法和家业目标", "婚后分工、家庭心愿、仙灵供奉、联合项目"),
    ("活动节奏不足", "内容大但版本节奏弱", "缺编排层和服务器辅助活动", "主题周 + 邮箱活动 + 全服共建 + 结算奖励"),
]
for row in matrix_rows:
    add("| " + " | ".join(row) + " |")
add()
add("### 3.2 设计原则")
add()
principles = [
    "所有消耗都要有尊严：要么带来新功能，要么带来新展示，要么带来新活动资格。",
    "所有重复都要有变化：同一个系统反复游玩时，需求、奖励、限制、热点、词缀至少变化其中两项。",
    "所有后期线都要互相喂养：至少存在一个输入和一个输出与其他系统相连。",
    "所有奖励都要可解释：玩家必须知道为什么值得做，不接受纯黑箱高价。",
    "所有结算都要可回滚：先校验、再扣除、再发奖、再记状态。",
]
for idx, p in enumerate(principles, 1):
    add(f"{idx}. {p}")
add()
add("---")
add()
add("## 四、目标架构（给 AI 的系统理解）")
add()
add("### 4.1 运行时主干")
add()
for item in [
    "日结总线：src/composables/useEndDay.ts",
    "主货币入口：src/stores/usePlayerStore.ts",
    "商店与目录消费：src/stores/useShopStore.ts",
    "任务与特殊订单：src/stores/useQuestStore.ts + src/data/quests.ts",
    "目标、主题周、长期追踪：src/stores/useGoalStore.ts + src/data/goals.ts",
    "村庄建设：src/stores/useVillageProjectStore.ts + src/data/villageProjects.ts",
    "瀚海循环：src/stores/useHanhaiStore.ts + src/data/hanhai.ts",
    "博物馆：src/stores/useMuseumStore.ts + src/data/museum.ts",
    "公会：src/stores/useGuildStore.ts + src/data/guild.ts",
    "在线活动能力：server/src/taoyuanMailbox.js + server/src/routes/api.js",
]:
    add(f"- {item}")
add()
add("### 4.2 新后期结构的推荐闭环")
add()
for item in [
    "闭环 A：赚钱 -> 高价建设 / 豪华目录消费 -> 解锁新订单池 / 新主题偏置 -> 提升高端玩法收益质量 -> 再投入。",
    "闭环 B：育种 / 鱼塘 -> 高规格特殊订单 -> 村庄建设前置 / 活动评分 -> 新展示与新市场热点 -> 继续育种。",
    "闭环 C：瀚海 / 公会 -> 赛季挑战 / 荣誉商店 -> 村庄与博物馆需求 -> 主题周结算 -> 邮箱发放奖励。",
    "闭环 D：关系 / 家庭 / 仙灵 -> 家业分工 / 心愿完成 -> 日常效率偏置 -> 参与新的经营周循环 -> 反馈回家庭成长。",
]:
    add(f"- {item}")
add()
add("### 4.3 核心指标公式建议")
add()
for item in [
    "指标 F1：通胀压力指数 = 当前可支配铜钱 / 最近 14 天日均净收入。",
    "指标 F2：消耗满足度 = 最近 14 天 sink 花费 / 最近 14 天总收入。",
    "指标 F3：循环多样度 = 最近 7 天参与系统数 + 最近 7 天高阶订单种类数。",
    "指标 F4：重复风险值 = 单一系统收入占比 * 单一系统操作占比。",
    "指标 F5：后期可玩密度 = 后期解锁目标数 / 玩家最近 7 天已完成目标数。",
]:
    add(f"- {item}")
add()
add("### 4.4 建议阈值")
add()
for item in [
    "F1 > 20：说明铜钱堆积严重，需要强化大额 sink 与活动价格带。",
    "F2 < 0.35：说明花钱出口不足，玩家虽然在赚钱，但没东西想买。",
    "F3 < 3：说明玩法过度单一，需要主题周、订单偏置和热点行情介入。",
    "F4 > 0.6：说明存在单一最优解，应通过周度热点和过剩惩罚做再平衡。",
]:
    add(f"- {item}")
add()
add("---")
add()
add("## 五、30 / 60 / 90 天更新策略")
add()
milestones = {
    "0-30 天：先把底座搭起来": [
        "做经济观测、通胀口径、日结挂点和基础灰度。",
        "做村庄建设 2.0 第一批高价项目。",
        "做商店豪华目录第一批功能型消费。",
        "做育种高规格特殊订单与主题周偏置。",
        "做主题周活动说明和邮箱活动模板。",
    ],
    "31-60 天：把后期循环串起来": [
        "做博物馆专题展、学者来访、祠堂主题供奉。",
        "做瀚海商路投资、遗迹套组与沙海限时挑战。",
        "做公会赛季任务、荣誉商店、异步轻排行。",
        "做 UI 推荐面板、通胀提示、资金去向建议。",
    ],
    "61-90 天：做活动层与可持续运营": [
        "做家庭 / 配偶 / 仙灵的后期陪伴线。",
        "做全服共建、赛季活动结算邮件、展示型评选。",
        "做更细致的调参、灰度、回滚、补偿与公告机制。",
        "基于数据继续扩内容池，而不是继续加无闭环新面板。",
    ],
}
for title, bullets in milestones.items():
    add(f"### 5.{len([x for x in lines if x.startswith('### 5.')]) + 1} {title}")
    add()
    for bullet in bullets:
        add(f"- {bullet}")
    add()
add("---")
add()
add("## 六、AI 执行规范")
add()
for item in [
    "所有任务必须带任务 ID、目标文件、依赖、实施说明、验收标准、风险提示。",
    "所有修改优先落在 store / data / composable，view 负责展示与交互。",
    "涉及奖励、花费、背包、订单、邮件、跨天结算时必须先考虑事务边界。",
    "涉及旧存档时必须写默认值、迁移策略和兼容测试。",
    "涉及活动和邮件时必须同时给出本地逻辑与服务端辅助方案。",
    "每个工作流都必须至少回答：为什么做、怎么接现有代码、如何验收、失败怎么兜底。",
]:
    add(f"- {item}")
add()
add("---")
add()
add("## 七、任务总览")
add()
add("| 工作流 | 目标 | 任务数 | 优先级 |")
add("|---|---|---:|---|")
for stream in STREAMS:
    add(f"| {stream['id']} {stream['name']} | {stream['goal']} | 10 | P0-P2 |")
add()
add("总任务数：120")
add()
add("---")
add()
add("## 八、详细任务台账")
add()

task_no = 1
for stream in STREAMS:
    add(f"## {stream['id']} {stream['name']}")
    add()
    add(f"- 工作流目标：{stream['goal']}")
    add(f"- 关键文件：{stream['store']}；{stream['data']}；{stream['view']}；{stream['scheduler']}")
    add(f"- 主要联动：{stream['links']}")
    add(f"- 核心能力：{stream['feature']}")
    add(f"- 核心指标：{stream['kpi']}")
    add(f"- 风险提醒：{stream['risks']}")
    add()

    for tpl in TASK_TEMPLATES:
        tid = f"T{task_no:03d}"
        add(f"### {tid} {stream['name']} - {tpl['name']}")
        add("- 状态：未开始")
        add(f"- 所属工作流：{stream['id']} {stream['name']}")
        add(f"- 目标：{render(tpl['goal'], stream)}")
        add(f"- 主要改动文件：{render(tpl['files'], stream)}")
        add(f"- 前置依赖：{tpl['depends']}")
        add(f"- 实施说明：{render(tpl['impl'], stream)}")
        add(f"- 验收标准：{render(tpl['accept'], stream)}")
        add(f"- 风险与注意：{render(tpl['risk'], stream)} 额外提醒：{stream['risks']}")
        add("- 备注：若与历史事务边界冲突，优先遵循三次玩法逻辑复审报告中的原子化与回滚要求。")
        add()
        task_no += 1

add("---")
add()
add("## 九、跨工作流依赖图")
add()
for item in [
    "依赖 D1：WS01 经济观测是 WS02~WS12 的共同基线。",
    "依赖 D2：WS02、WS03、WS04 共同构成花钱有处去 + 卖货不单一的经济治理层。",
    "依赖 D3：WS05、WS06、WS08、WS09 是后期非同质目标的主要内容层。",
    "依赖 D4：WS07、WS10 负责把后期内容做出版本节奏和社群感。",
    "依赖 D5：WS11 负责降低复杂度，让玩家理解新结构。",
    "依赖 D6：WS12 为全部工作流提供兼容、回滚、测试和补偿保障。",
]:
    add(f"- {item}")
add()
add("---")
add()
add("## 十、建议里程碑")
add()
for title, bullets in {
    "M1 经济治理底座上线": [
        "目标：完成 WS01、WS02、WS03 的首批可玩版本。",
        "结果：后期大额铜钱有初步回收路径；玩家开始感受到建设与豪华消费的价值。",
    ],
    "M2 循环多样度提升": [
        "目标：完成 WS04、WS05、WS06、WS08 的首批联动版本。",
        "结果：育种、博物馆、瀚海和行情系统共同降低单一最优解。",
    ],
    "M3 活动层与赛季层上线": [
        "目标：完成 WS07、WS10 的首批可运营版本。",
        "结果：后期出现赛季、主题周、邮箱活动、轻竞争和全服共建。",
    ],
    "M4 生活感与长期打磨": [
        "目标：完成 WS09、WS11、WS12 的稳定版本。",
        "结果：后期不只剩刷数值，还包含陪伴、引导、回访和稳定性保障。",
    ],
}.items():
    add(f"### {title}")
    for bullet in bullets:
        add(f"- {bullet}")
    add()

add("---")
add()
add("## 十一、发布前统一验收清单")
add()
for item in [
    "新增高价 sink 至少覆盖建设、商店、活动、展示、投资 5 类。",
    "任一后期主线都能明确说明：入口、花费、收益、循环、退出方式。",
    "任一主题周都能通过 data 配置扩展，而不是改硬编码。",
    "任一奖励、邮件、订单、结算在背包不足时都不会吞货。",
    "任一新增字段都能在旧存档下安全默认。",
    "任一轻竞争玩法都不会直接破坏玩家单机主进度。",
    "任一异常活动都可以通过配置或服务器开关快速关闭。",
    "UI 文案、README、教程、更新公告和实际逻辑口径一致。",
]:
    add(f"- [ ] {item}")
add()
add("---")
add()
add("## 十二、最终建议")
add()
add("如果资源有限，优先顺序建议是：WS01 -> WS02 -> WS03 -> WS05 -> WS10 -> WS12。")
add()
for idx, item in enumerate([
    "不先做经济观测，后面所有通胀治理都会变成拍脑袋。",
    "不先做村庄建设与豪华消费，后期铜钱依然无处可花。",
    "不先做育种订单化，后期非战斗玩家仍然缺主线目标。",
    "不先做活动编排，后期内容无法形成版本节奏与回流理由。",
    "不先做 QA / 回滚，后期系统越多，边界 bug 越容易放大。",
], 1):
    add(f"{idx}. {item}")
add()
add("本方案的重点不是再加一套孤立新功能，而是把现有内容体量真正转化为后期长期魅力。只要玩家在 50 小时后仍会思考“我下一周要把桃源乡推进成什么样”，这次更新就算做对了。")


content = "\n".join(lines) + "\n"
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
OUT_PATH.write_text(content, encoding="utf-8")

line_count = len(content.splitlines())
task_count = sum(1 for line in content.splitlines() if line.startswith("### T"))
print(f"WROTE={OUT_PATH.as_posix()}")
print(f"LINES={line_count}")
print(f"TASKS={task_count}")