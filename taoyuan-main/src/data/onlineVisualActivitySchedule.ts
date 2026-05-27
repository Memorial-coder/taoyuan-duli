export type OnlineVisualScheduleCadence = 'festival' | 'daily' | 'weekly' | 'seasonal'

export type OnlineVisualScheduleRouteName =
  | 'online-festival'
  | 'online-manor'
  | 'online-orders'
  | 'online-society'
  | 'online-cohabitation'
  | 'village'

export interface OnlineVisualActivityScheduleEntry {
  id: string
  cadence: OnlineVisualScheduleCadence
  title: string
  windowLabel: string
  entryLabel: string
  routeName: OnlineVisualScheduleRouteName
  routeQuery?: Record<string, string>
  sceneSpecId?: string
  visualScene: string
  rewardPoolLabel: string
  rewardSettlement: string
  npcLine: string
  replayRetention: string
  testId: string
}

export const ONLINE_VISUAL_FESTIVAL_ACTIVITY_CALENDAR: OnlineVisualActivityScheduleEntry[] = [
  {
    id: 'yuanxiao_lantern_fair',
    cadence: 'festival',
    title: '元宵灯会',
    windowLabel: '正月十五',
    entryLabel: '灯会共建房',
    routeName: 'online-festival',
    routeQuery: { tab: 'festival-room', template: 'lantern_fair' },
    sceneSpecId: 'lantern_fair',
    visualScene: '主灯、灯谜架、摊位、人群、留影点同屏出现。',
    rewardPoolLabel: '基础参与、协作表现、留影纪念、好友回看。',
    rewardSettlement: '只定义奖励池口径，实际落账继续走服务端活动房间凭证。',
    npcLine: '灯谜摊主：先稳住人群，再请人去点主灯。',
    replayRetention: '过期后保留灯会留影、主灯署名、灯谜与秩序回看。',
    testId: 'online-visual-schedule-yuanxiao-lantern-fair',
  },
  {
    id: 'duanwu_dragon_boat',
    cadence: 'festival',
    title: '端午赛舟',
    windowLabel: '五月初五',
    entryLabel: '龙舟竞速房',
    routeName: 'online-festival',
    routeQuery: { tab: 'festival-room', template: 'dragon_boat' },
    sceneSpecId: 'dragon_boat',
    visualScene: '河道、龙舟、鼓点、水流、岸边观众和粽子摊组成赛道。',
    rewardPoolLabel: '参赛、名次、鼓点协作、龙舟称号和节会人气。',
    rewardSettlement: '名次和称号只从服务端赛舟凭证读回，不由前端发奖。',
    npcLine: '鼓手：听我这一槌，弯道前别抢桨。',
    replayRetention: '过期后保留多队名次、船位、赛舟分和冲线回看。',
    testId: 'online-visual-schedule-duanwu-dragon-boat',
  },
  {
    id: 'qixi_stroll',
    cadence: 'festival',
    title: '七夕同游',
    windowLabel: '七月初七',
    entryLabel: '七夕同游房',
    routeName: 'online-festival',
    routeQuery: { tab: 'festival-room', template: 'qixi_stroll' },
    sceneSpecId: 'qixi_stroll',
    visualScene: '鹊桥、许愿树、花灯、情侣 NPC 和误会剧情点形成同游路线。',
    rewardPoolLabel: '同游完成、误会解开、愿望留存和合照纪念。',
    rewardSettlement: '关系线索只做纪念与回看，跨玩家奖励仍按服务端凭证收口。',
    npcLine: '桥边少女：花灯别急着递，先听听对方想许什么愿。',
    replayRetention: '过期后保留许愿、递灯、误会收束和合照纪念。',
    testId: 'online-visual-schedule-qixi-stroll',
  },
  {
    id: 'mid_autumn_market',
    cadence: 'festival',
    title: '中秋集市',
    windowLabel: '八月十五',
    entryLabel: '赏月集市房',
    routeName: 'online-festival',
    routeQuery: { tab: 'festival-room', template: 'mid_autumn_moonwatch' },
    sceneSpecId: 'mid_autumn_moonwatch',
    visualScene: '月台、集市、月饼摊、猜谜、家宴和团圆剧情同场展示。',
    rewardPoolLabel: '赏月参与、猜谜协作、家宴团圆和集市纪念。',
    rewardSettlement: '集市与家宴奖励仅定义投放层，真实资产写回必须由服务端凭证执行。',
    npcLine: '月饼摊主：猜中灯谜的先别走，月台还缺一盏灯。',
    replayRetention: '过期后保留月台布置、猜谜、家宴与团圆剧情回看。',
    testId: 'online-visual-schedule-mid-autumn-market',
  },
  {
    id: 'new_year_vigil',
    cadence: 'festival',
    title: '除夕守岁',
    windowLabel: '腊月三十',
    entryLabel: '守岁共建房',
    routeName: 'online-festival',
    routeQuery: { tab: 'festival-room', template: 'yuanri_vigil' },
    sceneSpecId: 'yuanri_vigil',
    visualScene: '守岁火盆、年饭桌、爆竹、拜年、家族合照和旧岁回顾收束年夜。',
    rewardPoolLabel: '守岁参与、年饭协作、旧岁回顾和合照纪念。',
    rewardSettlement: '称号、纪念和节会人气从服务端结算读回，前端只展示排期。',
    npcLine: '守岁老人：火盆别熄，等人齐了再拍合照。',
    replayRetention: '过期后保留守火、年饭、拜年、合照和旧岁回顾。',
    testId: 'online-visual-schedule-new-year-vigil',
  },
]

export const ONLINE_VISUAL_DAILY_ACTIVITY_ROTATION: OnlineVisualActivityScheduleEntry[] = [
  {
    id: 'daily_manor_care',
    cadence: 'daily',
    title: '好友照料',
    windowLabel: '每日 3 分钟',
    entryLabel: '照料热区',
    routeName: 'online-manor',
    routeQuery: { tab: 'care' },
    sceneSpecId: 'manor_care',
    visualScene: '好友田地、果树、畜棚和护理房对象以场景物件读回。',
    rewardPoolLabel: '友情点、健康度反馈和轻伴手礼。',
    rewardSettlement: '每日次数、审计和收益上限继续由庄园服务端结算。',
    npcLine: '来访小童：帮忙浇一畦就好，别把主人家的节奏打乱。',
    replayRetention: '过期后保留访客记录、照料对象、健康度变化和反刷摘要。',
    testId: 'online-visual-schedule-daily-manor-care',
  },
  {
    id: 'daily_public_order',
    cadence: 'daily',
    title: '公共订单',
    windowLabel: '每日短单',
    entryLabel: '接力订单板',
    routeName: 'online-orders',
    routeQuery: { tab: 'available', mode: 'relay' },
    sceneSpecId: 'public_order_relay',
    visualScene: '订单路线、阶段接单、交付确认和分账摘要组成异步流程图。',
    rewardPoolLabel: '阶段贡献、跑腿补偿、分账摘要和订单故事。',
    rewardSettlement: '公共订单收益只按服务端确认交付和凭证分账落账。',
    npcLine: '订单板伙计：今天这单分三段，谁有空就接下一段。',
    replayRetention: '过期后保留订单故事流转、阶段贡献者和分账凭证。',
    testId: 'online-visual-schedule-daily-public-order',
  },
  {
    id: 'daily_small_cavern',
    cadence: 'daily',
    title: '小矿洞',
    windowLabel: '每日短房',
    entryLabel: '协作矿洞',
    routeName: 'online-festival',
    routeQuery: { tab: 'expedition-room', template: 'expedition_cavern' },
    sceneSpecId: 'expedition_cavern',
    visualScene: '6 个以上节点、撤离点、风险资源和路线回看构成短局地图。',
    rewardPoolLabel: '节点贡献、组合收益、提前撤离和路线纪念。',
    rewardSettlement: '矿洞收益继续由活动房间服务端结算凭证落账。',
    npcLine: '矿口把头：路标够了就撤，别为了最后一铲折回去。',
    replayRetention: '过期后保留路线、组合收益、最高风险时刻和成员贡献。',
    testId: 'online-visual-schedule-daily-small-cavern',
  },
  {
    id: 'daily_random_visit',
    cadence: 'daily',
    title: '随机来访',
    windowLabel: '每日偶遇',
    entryLabel: '村口来客',
    routeName: 'village',
    routeQuery: { panel: 'visitors' },
    sceneSpecId: 'random_visit',
    visualScene: '只作为日程提醒读回村口来客，不改随机 NPC 生成与关系系统。',
    rewardPoolLabel: '对话线索、轻订单和关系记忆。',
    rewardSettlement: '本轮不新增 NPC 奖励，既有单机存档逻辑自行收口。',
    npcLine: '村口行人：我只停一日，有事就趁日头还亮。',
    replayRetention: '过期后回到既有旧日摘要或熟人册，不新增无限日志。',
    testId: 'online-visual-schedule-daily-random-visit',
  },
]

export const ONLINE_VISUAL_WEEKLY_ACTIVITY_ROTATION: OnlineVisualActivityScheduleEntry[] = [
  {
    id: 'weekly_bridge_project',
    cadence: 'weekly',
    title: '村社修桥',
    windowLabel: '每周公共工程',
    entryLabel: '修桥现场',
    routeName: 'online-society',
    routeQuery: { tab: 'projects', project: 'bridge_repair' },
    sceneSpecId: 'bridge_repair',
    visualScene: '断桥、脚手架、桥面、栏杆和通行仪式按阶段变化。',
    rewardPoolLabel: '施工贡献、通行增益、桥头纪念碑和史册记录。',
    rewardSettlement: '公共工程收益从村社服务端阶段和史册记录读回。',
    npcLine: '工头：今天先补桥面，栏杆留给下一班。',
    replayRetention: '完工后保留桥头纪念碑、贡献榜和通行增益记录。',
    testId: 'online-visual-schedule-weekly-bridge-project',
  },
  {
    id: 'weekly_festival_square',
    cadence: 'weekly',
    title: '节庆筹备',
    windowLabel: '每周长目标',
    entryLabel: '节庆广场',
    routeName: 'online-society',
    routeQuery: { tab: 'projects', project: 'festival_square' },
    sceneSpecId: 'festival_square',
    visualScene: '备料、搭场、彩排、开幕四阶段把广场从空地变成节会现场。',
    rewardPoolLabel: '筹备贡献、开幕留影、公共奖励预热和节会入口。',
    rewardSettlement: '完工联动只提供服务端房间入口描述，不直接发个人资产。',
    npcLine: '彩排领队：布景先搭好，开幕才不会像临时摊。',
    replayRetention: '完工后保留开幕留影、贡献影响和节会房间入口回看。',
    testId: 'online-visual-schedule-weekly-festival-square',
  },
  {
    id: 'weekly_family_order',
    cadence: 'weekly',
    title: '家族订单',
    windowLabel: '每周协作单',
    entryLabel: '家族接力单',
    routeName: 'online-orders',
    routeQuery: { tab: 'available', mode: 'family' },
    sceneSpecId: 'family_order',
    visualScene: '以公共订单接力路线承接家族订单，不新增第二套订单状态机。',
    rewardPoolLabel: '阶段贡献、家族声望、订单故事和凭证分账。',
    rewardSettlement: '订单收益仍按服务端确认交付、共同基金选择和分账凭证落账。',
    npcLine: '账房先生：这单要分头办，账目最后一起清。',
    replayRetention: '过期后保留订单故事、阶段贡献、分账与补偿凭证。',
    testId: 'online-visual-schedule-weekly-family-order',
  },
  {
    id: 'weekly_shared_manor_goal',
    cadence: 'weekly',
    title: '共同庄园周目标',
    windowLabel: '每周庄园目标',
    entryLabel: '共同庄园',
    routeName: 'online-cohabitation',
    routeQuery: { tab: 'overview' },
    sceneSpecId: 'shared_manor_weekly_goal',
    visualScene: '只读承接共同庄园周目标入口，不改共同仓库、基金或分居治理。',
    rewardPoolLabel: '共同经营效率、纪念、轻称号和周目标摘要。',
    rewardSettlement: '本轮只定义入口，真实共同资产奖励必须另走服务端权威链。',
    npcLine: '庄园管事：本周先把目标写清，别把仓库当成无底筐。',
    replayRetention: '过期后保留周目标摘要、参与成员和共同经营记录。',
    testId: 'online-visual-schedule-weekly-shared-manor-goal',
  },
]

export const ONLINE_VISUAL_SEASONAL_ACTIVITY_ROTATION: OnlineVisualActivityScheduleEntry[] = [
  {
    id: 'seasonal_family_manor_rating',
    cadence: 'seasonal',
    title: '家族庄园评级',
    windowLabel: '赛季结算',
    entryLabel: '评级看板',
    routeName: 'online-society',
    routeQuery: { tab: 'chronicles', view: 'rating' },
    sceneSpecId: 'family_manor_rating',
    visualScene: '赛季只读看板聚合庄园、村社工程和公共订单表现。',
    rewardPoolLabel: '外观、称号、纪念卡框和轻效率，不给硬资源堆叠。',
    rewardSettlement: '评级奖励必须走服务端赛季凭证，本轮只落展示定义。',
    npcLine: '评审：看的是这季留下的痕迹，不是一晚堆出来的库存。',
    replayRetention: '赛季结束后保留评级卡、来源摘要和公开展示入口。',
    testId: 'online-visual-schedule-seasonal-family-manor-rating',
  },
  {
    id: 'seasonal_festival_album',
    cadence: 'seasonal',
    title: '节会留影册',
    windowLabel: '赛季纪念',
    entryLabel: '节会纪念',
    routeName: 'online-festival',
    routeQuery: { tab: 'memorials' },
    sceneSpecId: 'festival_album',
    visualScene: '按节会现场素材、房间凭证和好友回看汇总留影。',
    rewardPoolLabel: '纪念册、称号、卡框和好友回看，不新增资源产出。',
    rewardSettlement: '只读回看来自既有节会房间凭证和纪念册记录。',
    npcLine: '照相师：有些灯火过季了，影子还在册子里。',
    replayRetention: '长期保留留影、署名、高光与复刻入口。',
    testId: 'online-visual-schedule-seasonal-festival-album',
  },
  {
    id: 'seasonal_npc_memory_album',
    cadence: 'seasonal',
    title: 'NPC 关系回忆册',
    windowLabel: '赛季回忆',
    entryLabel: '关系回忆',
    routeName: 'village',
    routeQuery: { panel: 'relationship-memories' },
    sceneSpecId: 'npc_memory_album',
    visualScene: '只定义赛季回忆入口，不改 NPC 恋爱、家族或孩子深线。',
    rewardPoolLabel: '回忆文本、称号候选和公开可见性提示。',
    rewardSettlement: '本轮不新增 NPC 奖励，仍由单机关系存档保留。',
    npcLine: '旧友：若还记得那日，就把它写进册子里吧。',
    replayRetention: '赛季结束后保留回忆索引，公开展示需玩家主动允许。',
    testId: 'online-visual-schedule-seasonal-npc-memory-album',
  },
]

export const ONLINE_VISUAL_EXPIRED_ACTIVITY_RETENTION = [
  '活动过期后优先保留纪念册、史册、订单故事或访客记录，不删除服务端凭证。',
  '节会与活动房间提供复刻入口时，只复刻入口和回看，不自动重发奖励。',
  '配置缺失或功能关闭时，排期仍指向旧按钮面板、只读纪念或对应模块总览。',
] as const

export const ONLINE_VISUAL_ACTIVITY_SCHEDULES = [
  ...ONLINE_VISUAL_FESTIVAL_ACTIVITY_CALENDAR,
  ...ONLINE_VISUAL_DAILY_ACTIVITY_ROTATION,
  ...ONLINE_VISUAL_WEEKLY_ACTIVITY_ROTATION,
  ...ONLINE_VISUAL_SEASONAL_ACTIVITY_ROTATION,
] as const

export const getOnlineVisualActivityScheduleById = (id: string) =>
  ONLINE_VISUAL_ACTIVITY_SCHEDULES.find(entry => entry.id === id) ?? null
