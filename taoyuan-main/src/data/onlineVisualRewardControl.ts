export type OnlineVisualRewardControlKey =
  | 'visual_mini_games'
  | 'manor_care'
  | 'manor_steal'
  | 'coop_order_relay'
  | 'society_async_projects'
  | 'festival_memorials'
  | 'shared_manor_weekly_goal'
  | 'crop_secondary_inventory_sinks'
  | 'crafting_convenience_rewards'
  | 'family_manor_reward_mix'

export interface OnlineVisualRewardControlPolicy {
  key: OnlineVisualRewardControlKey
  label: string
  baseReward: string
  performanceReward: string
  collaborationReward: string
  memorialReward: string
  serverAuthority: string
  capSummary: string
  antiInflationRule: string
  soloParityRule: string
  testId: string
}

export const ONLINE_VISUAL_REWARD_CONTROL_POLICIES: OnlineVisualRewardControlPolicy[] = [
  {
    key: 'visual_mini_games',
    label: '联机小游戏',
    baseReward: '基础参与奖励只覆盖门票、少量节会票券或低额铜钱。',
    performanceReward: '表现奖励只读服务端房间分数、节点贡献、名次或完成度。',
    collaborationReward: '协作奖励优先给称号、人气、纪念和轻效率，不给稀有材料稳定产出。',
    memorialReward: '纪念奖励落在路线回放、留影、称号和纪念册，不重复发资产。',
    serverAuthority: '活动房间奖励必须由服务端结算凭证和幂等键落账。',
    capSummary: '单局奖励受房间结算次数、成员贡献和凭证重放保护约束。',
    antiInflationRule: '不能把 2-5 分钟短局做成铜币或稀有材料最优解。',
    soloParityRule: '单人玩家仍可通过单人经营和单人保底推进，不被联机奖励锁住。',
    testId: 'online-visual-reward-control-mini-games',
  },
  {
    key: 'manor_care',
    label: '好友照料',
    baseReward: '来访者只给友情点、轻伴手礼或照料记录。',
    performanceReward: '健康度、轻加速和保护归主人庄园，且受每日照料上限约束。',
    collaborationReward: '多人护理房给护理窗口、分工记录和健康度摘要，不给硬资源堆叠。',
    memorialReward: '主人访客记录保留谁帮了什么、何时帮和服务端凭证。',
    serverAuthority: '照料次数、健康度、访客记录和审计由庄园服务端写入。',
    capSummary: '单访客每日次数、单庄园每日被照料次数和反刷窗口同时生效。',
    antiInflationRule: '好友照料收益轻于正常经营产出，避免互刷成为日常必做。',
    soloParityRule: '不接受好友照料时，主人仍按个人农场节奏稳定推进。',
    testId: 'online-visual-reward-control-manor-care',
  },
  {
    key: 'manor_steal',
    label: '有限制偷菜',
    baseReward: '偷菜只允许普通成熟作物、边角产物和普通果实的小比例收益。',
    performanceReward: '不给额外表现奖励，留言和趣味记录优先于资源收益。',
    collaborationReward: '给主人友情点、幸运种子或次日产量保护补偿，避免纯损失感。',
    memorialReward: '访客记录保留对象、数量、主人保留比例、留言和争议凭证。',
    serverAuthority: '偷菜收益、补偿、日志、主人开关和反刷阻断必须由服务端结算。',
    capSummary: '单访客每日次数、单庄园总量、单块田 / 单棵树主人保留比例共同限制。',
    antiInflationRule: '偷菜收益严格低于正常种植收获，禁止任务物、稀有物和绑定物。',
    soloParityRule: '主人关闭偷菜或只限互关后，经营效率不应下降。',
    testId: 'online-visual-reward-control-manor-steal',
  },
  {
    key: 'coop_order_relay',
    label: '公共订单接力',
    baseReward: '阶段参与奖励来自订单阶段贡献，不直接由前端派发。',
    performanceReward: '交付质量、时效和阶段完成度只影响服务端分账摘要。',
    collaborationReward: '多人分账按阶段贡献者和确认交付凭证拆分。',
    memorialReward: '订单故事流转、阶段贡献、补偿和分账凭证可长期回看。',
    serverAuthority: '公共订单收益必须由服务端确认交付、分账凭证或共同基金入账。',
    capSummary: '每单只结算一次，重复确认、补偿重放和共同基金选择都受幂等保护。',
    antiInflationRule: '公共订单收益不能绕过库存消耗、交付验收和补偿边界。',
    soloParityRule: '玩家可继续发布或完成普通单，不被多人接力单强制绑定。',
    testId: 'online-visual-reward-control-coop-order-relay',
  },
  {
    key: 'society_async_projects',
    label: '村社异步工程',
    baseReward: '贡献以公共工程阶段进度、贡献榜和史册为主。',
    performanceReward: '完工效果优先是通行增益、节会成本下降和公共任务加成。',
    collaborationReward: '多人协作奖励落在村社公共效果和纪念碑，不直接堆个人资产。',
    memorialReward: '史册、桥头纪念碑、花灯墙和仓廪周结算保留来源记录。',
    serverAuthority: '公共工程阶段、仓廪周结算和公共效果由村社服务端快照读回。',
    capSummary: '贡献包、周结算、灾害应对和节会成本下降按服务端周期限制。',
    antiInflationRule: '公共建设不稳定产出稀有材料，主要给公共便利和纪念。',
    soloParityRule: '不参加村社的玩家仍能通过个人经营推进主线。',
    testId: 'online-visual-reward-control-society-async-projects',
  },
  {
    key: 'festival_memorials',
    label: '节会纪念',
    baseReward: '节会基础奖励只覆盖门票、人气或低额参与反馈。',
    performanceReward: '点亮主灯、解谜、维持秩序和龙舟名次只读房间凭证。',
    collaborationReward: '协作表现优先转成留影、署名、称号和好友回看。',
    memorialReward: '留影册、节会纪念册、路线回看和复刻入口长期保留。',
    serverAuthority: '节会纪念和称号从活动房间结算凭证与纪念册记录读回。',
    capSummary: '纪念和称号可回看，资产奖励不可因复刻或回放重复发放。',
    antiInflationRule: '节会玩法卖点是现场感与纪念，不是临时高收益奖励池。',
    soloParityRule: '错过联机节会时仍有单人保底目标和过期纪念入口。',
    testId: 'online-visual-reward-control-festival-memorials',
  },
  {
    key: 'shared_manor_weekly_goal',
    label: '共同庄园周目标',
    baseReward: '周目标只定义操作效率、共同回看、纪念和轻称号口径。',
    performanceReward: '共同经营表现只影响等待、确认、协作提示或公共展示，不直接兑换高价值共同资产。',
    collaborationReward: '协作加成偏体验改善和流程减负，不提高个人基础产量、个人铜币或稀有材料稳定来源。',
    memorialReward: '周目标摘要、参与成员和共同经营记录保留为只读回看。',
    serverAuthority: '真实共同资产奖励必须另走共同庄园服务端权威链路，且读回个人资产不变边界。',
    capSummary: '共同庄园效率加成只在指定操作或周目标周期内生效，不新增共同仓库、共同基金或分居演算捷径。',
    antiInflationRule: '共同庄园加成不应成为个人铜币、稀有材料、仓库或基金收益捷径。',
    soloParityRule: '单人庄园玩家不因缺少共同周目标而失去核心经营效率。',
    testId: 'online-visual-reward-control-shared-manor-weekly-goal',
  },
  {
    key: 'crop_secondary_inventory_sinks',
    label: '作物二级用途',
    baseReward: '新增料理、炼丹、宠物、订单、节会或联机用途优先消耗既有背包、仓库或公共仓库存。',
    performanceReward: '用途标签只提高匹配、建议、交付和故事线索质量，不提高作物基础售价。',
    collaborationReward: '公共订单、节会供品和共同工坊只按服务端扣料凭证或共同仓库流水结算。',
    memorialReward: '消耗去向、用途标签、来源库存和公共仓记录可在订单、百科、共同流水或回看中读回。',
    serverAuthority: '个人侧由背包 / 仓库消耗链路扣料，联机与共同庄园侧由服务端 consume ledger 或结算凭证扣料。',
    capSummary: '二级用途以配方数量、每日次数、公共仓预算、订单周期和活动周期限制消耗，不凭空生成等价铜币。',
    antiInflationRule: '作物用途扩展必须先做库存出口，禁止把新增用途做成换皮铜币、稀有材料或无限交付池。',
    soloParityRule: '不参与联机或不做二级制作的玩家仍可按原种植、订单和主线经营推进。',
    testId: 'online-visual-reward-control-crop-secondary-inventory-sinks',
  },
  {
    key: 'crafting_convenience_rewards',
    label: '炼丹 / 料理 / 宠物喂食',
    baseReward: '炼丹、料理和宠物喂食提供体力恢复、短期增益、线索反馈、安抚和小概率发现等差异化便利。',
    performanceReward: '炼丹受主丹 / 辅丹每日次数和结果权重约束，料理是一次性成品，宠物特别喂食每日一次。',
    collaborationReward: '共同工坊的料理升品和炼丹成功率只改善协作体验，产物仍回共同仓库并受取出保护。',
    memorialReward: '料理故事触发、丹方结果、宠物口味和寻物反馈保留为记录与回看，不作为重复资产入口。',
    serverAuthority: '共同料理 / 炼丹由共同庄园服务端写 consume / deposit ledger，个人侧按本地库存与每日限制结算。',
    capSummary: '主丹每日 1 次、辅丹每日 2 次；宠物稀有发现受好感门槛、冷却和概率封顶约束。',
    antiInflationRule: '便利奖励不得稳定堆高宠物成长、稀有材料或铜币，只能给短期体验差异和低频小物反馈。',
    soloParityRule: '不使用炼丹、料理或宠物喂食的玩家仍能靠普通体力、经营节奏和主线任务推进。',
    testId: 'online-visual-reward-control-crafting-convenience-rewards',
  },
  {
    key: 'family_manor_reward_mix',
    label: '家族庄园奖励',
    baseReward: '家族庄园基础奖励以外观、称号、纪念、声望、公共展示和轻效率为主。',
    performanceReward: '家族订单、节会席位和声望表现只可给小额共同基金、共同仓库或声望进度，不发个人铜币最优解。',
    collaborationReward: '多人贡献落到职位、贡献榜、公共建筑、家族纪念和共同日志，硬资源只走共享池。',
    memorialReward: '家族评级、节会合照、订单故事、声望等级和建筑里程碑可长期回看。',
    serverAuthority: '家族订单、声望奖励、节会奖励和建筑奖励必须由服务端幂等 ledger、共同基金或共同仓库写链结算。',
    capSummary: '声望有每周上限和领取成本；节会与订单奖励按幂等键、周期和共享池路径限制。',
    antiInflationRule: '家族庄园不稳定产出个人硬资源，少量硬资源必须进入共享池并保留补偿 / 回滚证据。',
    soloParityRule: '不加入家族庄园的玩家仍可通过个人订单、单人节会和主线经营取得稳定进展。',
    testId: 'online-visual-reward-control-family-manor-reward-mix',
  },
]

export const ONLINE_VISUAL_REWARD_GLOBAL_GUARDRAILS = [
  '所有跨玩家奖励必须由服务端凭证、确认交付、公共工程快照或庄园审计落账。',
  '复刻、回放、纪念册和好友回看不能重复发放个人资产。',
  '轻社交奖励优先给称号、纪念、效率和可读记录，少给硬资源。',
  '作物二级用途必须优先消耗既有库存，不能把用途标签变成新增硬资源来源。',
  '炼丹、料理和宠物喂食只给差异化便利、短期反馈或低频小物，不稳定堆高数值成长。',
  '共同庄园和家族庄园硬资源奖励只走共享池、周期上限和幂等凭证，不覆盖单人经营主线。',
  '配置缺失时默认保守：只读入口和旧按钮面板保留，收益不扩大。',
] as const

export const getOnlineVisualRewardControlPolicy = (key: OnlineVisualRewardControlKey) =>
  ONLINE_VISUAL_REWARD_CONTROL_POLICIES.find(policy => policy.key === key) ?? null
