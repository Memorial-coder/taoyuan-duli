export type OnlineFestivalSceneAssetKind = 'anchor' | 'clickable' | 'ambient' | 'stall' | 'npc'

export interface OnlineFestivalSceneAsset {
  id: string
  label: string
  kind: OnlineFestivalSceneAssetKind
  firstScreen: boolean
  clickable: boolean
  summary: string
}

export interface OnlineFestivalSceneAssetSpec {
  templateId: string
  label: string
  firstScreenSignal: string
  collaborationGoal: string
  soloFallbackGoal: string
  assets: OnlineFestivalSceneAsset[]
}

export const ONLINE_FESTIVAL_SCENE_ASSET_SPECS: OnlineFestivalSceneAssetSpec[] = [
  {
    templateId: 'lantern_fair',
    label: '上元灯会现场',
    firstScreenSignal: '主灯、灯谜架、摊位、人群和留影点会在首屏同时露出，房间不是通用面板。',
    collaborationGoal: '多人分工点亮主灯、解开灯谜、维持秩序并完成留影收口。',
    soloFallbackGoal: '单人可先处理灯谜架或摊位补给，保留最低进度与纪念读回。',
    assets: [
      { id: 'main_lantern', label: '主灯', kind: 'anchor', firstScreen: true, clickable: true, summary: '灯会中心目标，承接点亮与最终收口。' },
      { id: 'riddle_rack', label: '灯谜架', kind: 'clickable', firstScreen: true, clickable: true, summary: '解谜行动入口，沉淀灯谜贡献记录。' },
      { id: 'festival_stall', label: '摊位', kind: 'stall', firstScreen: true, clickable: true, summary: '补给与摊位秩序入口，避免现场只剩背景。' },
      { id: 'crowd_order', label: '人群', kind: 'npc', firstScreen: true, clickable: true, summary: '维持秩序入口，读回压力与过热状态。' },
      { id: 'photo_spot', label: '留影点', kind: 'clickable', firstScreen: true, clickable: true, summary: '生成留影与好友回看记忆。' },
      { id: 'fireworks', label: '烟火', kind: 'ambient', firstScreen: false, clickable: false, summary: '结算和高光时展示的氛围素材。' },
      { id: 'parade_team', label: '巡游队', kind: 'ambient', firstScreen: false, clickable: false, summary: '后续扩展巡游事件与人群动线。' },
    ],
  },
  {
    templateId: 'dragon_boat',
    label: '端午赛舟现场',
    firstScreenSignal: '河道、龙舟、鼓点、水流、岸边观众和粽子摊组成首屏赛道现场。',
    collaborationGoal: '2-8 人按鼓点、划桨、稳舵和冲刺窗口推进多队竞速名次。',
    soloFallbackGoal: '2 人演练房可先完成双船练习，仍保留名次、船位和赛舟分回看。',
    assets: [
      { id: 'river_track', label: '河道', kind: 'anchor', firstScreen: true, clickable: true, summary: '赛道格与冲线目标的视觉基底。' },
      { id: 'dragon_boat', label: '龙舟', kind: 'clickable', firstScreen: true, clickable: true, summary: '队伍位置、状态和上一行动读回。' },
      { id: 'drumbeat', label: '鼓点', kind: 'clickable', firstScreen: true, clickable: true, summary: '节奏窗口与 boost 格提示。' },
      { id: 'water_flow', label: '水流', kind: 'ambient', firstScreen: true, clickable: true, summary: '风险 / 推进效果提示，不直接发奖。' },
      { id: 'riverbank_crowd', label: '岸边观众', kind: 'npc', firstScreen: true, clickable: false, summary: '现场喝彩与名次反馈。' },
      { id: 'zongzi_stall', label: '粽子摊', kind: 'stall', firstScreen: true, clickable: true, summary: '端午补给和节庆识别点。' },
    ],
  },
  {
    templateId: 'qixi_stroll',
    label: '七夕同游现场',
    firstScreenSignal: '鹊桥、许愿树、花灯、情侣 NPC 和误会剧情点在首屏形成同游路线。',
    collaborationGoal: '双人同游时分工递花灯、解开误会并在鹊桥收束合照。',
    soloFallbackGoal: '单人可先整理许愿树与花灯线索，保留关系线索和节会回看。',
    assets: [
      { id: 'magpie_bridge', label: '鹊桥', kind: 'anchor', firstScreen: true, clickable: true, summary: '七夕路线中心，承接同游终点与合照。' },
      { id: 'wish_tree', label: '许愿树', kind: 'clickable', firstScreen: true, clickable: true, summary: '许愿与关系线索入口。' },
      { id: 'qixi_lanterns', label: '花灯', kind: 'clickable', firstScreen: true, clickable: true, summary: '递灯、挂灯和轻解谜互动入口。' },
      { id: 'couple_npcs', label: '情侣 NPC', kind: 'npc', firstScreen: true, clickable: true, summary: '同游旁观反馈和关系氛围来源。' },
      { id: 'misunderstanding_spot', label: '误会剧情点', kind: 'clickable', firstScreen: true, clickable: true, summary: '处理误会、保留剧情回看。' },
    ],
  },
  {
    templateId: 'mid_autumn_moonwatch',
    label: '中秋赏月现场',
    firstScreenSignal: '月台、集市、月饼摊、猜谜、家宴和团圆剧情在首屏组成赏月席面。',
    collaborationGoal: '多人分工布置月台、备月饼、猜谜并完成家宴团圆记录。',
    soloFallbackGoal: '单人可先摆月台或猜一轮灯谜，保留月下纪念与基础进度。',
    assets: [
      { id: 'moon_platform', label: '月台', kind: 'anchor', firstScreen: true, clickable: true, summary: '赏月主视觉和进度核心。' },
      { id: 'autumn_market', label: '集市', kind: 'stall', firstScreen: true, clickable: true, summary: '节前采买和公共订单承接口。' },
      { id: 'mooncake_stall', label: '月饼摊', kind: 'stall', firstScreen: true, clickable: true, summary: '备料、分食和节庆识别点。' },
      { id: 'moon_riddle_table', label: '猜谜', kind: 'clickable', firstScreen: true, clickable: true, summary: '中秋轻解谜互动入口。' },
      { id: 'family_banquet', label: '家宴', kind: 'clickable', firstScreen: true, clickable: true, summary: '团圆席面与温和协作目标。' },
      { id: 'reunion_story', label: '团圆剧情', kind: 'npc', firstScreen: true, clickable: true, summary: '关系回看和家人对话承接点。' },
    ],
  },
  {
    templateId: 'yuanri_vigil',
    label: '除夕守岁现场',
    firstScreenSignal: '守岁火盆、年饭桌、爆竹、拜年、家族合照和旧岁回顾组成首屏年夜现场。',
    collaborationGoal: '多人协作添火、备年饭、安排拜年和家族合照，收束旧岁回顾。',
    soloFallbackGoal: '单人可先守火盆或整理旧岁回顾，保留年夜纪念和基础祝福。',
    assets: [
      { id: 'vigil_brazier', label: '守岁火盆', kind: 'anchor', firstScreen: true, clickable: true, summary: '除夕主视觉与守岁进度核心。' },
      { id: 'new_year_table', label: '年饭桌', kind: 'clickable', firstScreen: true, clickable: true, summary: '年饭备席和家庭氛围入口。' },
      { id: 'firecrackers', label: '爆竹', kind: 'ambient', firstScreen: true, clickable: true, summary: '热闹度和收尾高光素材。' },
      { id: 'new_year_greetings', label: '拜年', kind: 'npc', firstScreen: true, clickable: true, summary: '拜年互动与关系反馈入口。' },
      { id: 'family_photo', label: '家族合照', kind: 'clickable', firstScreen: true, clickable: true, summary: '多人纪念收口。' },
      { id: 'year_review', label: '旧岁回顾', kind: 'clickable', firstScreen: true, clickable: true, summary: '年度回顾和纪年读回。' },
    ],
  },
  {
    templateId: 'market_fair',
    label: '节会集市现场',
    firstScreenSignal: '货摊、讨价还价、稀有商人、随机 NPC 和公共订单板组成首屏市集动线。',
    collaborationGoal: '多人分工补摊、议价、接力公共订单并维护集市秩序。',
    soloFallbackGoal: '单人可先查看公共订单板或整理货摊，保留市集线索与轻量进度。',
    assets: [
      { id: 'market_stalls', label: '货摊', kind: 'anchor', firstScreen: true, clickable: true, summary: '市集主视觉和摊位补货入口。' },
      { id: 'bargain_table', label: '讨价还价', kind: 'clickable', firstScreen: true, clickable: true, summary: '议价与消费反馈入口。' },
      { id: 'rare_merchant', label: '稀有商人', kind: 'npc', firstScreen: true, clickable: true, summary: '稀有商品展示和治理提示承接。' },
      { id: 'random_npc_corner', label: '随机 NPC', kind: 'npc', firstScreen: true, clickable: true, summary: '市集偶遇和轻剧情入口。' },
      { id: 'public_order_board', label: '公共订单板', kind: 'clickable', firstScreen: true, clickable: true, summary: '公共订单接力和多人分账入口。' },
    ],
  },
]

export const getOnlineFestivalSceneAssetSpec = (templateId: string) =>
  ONLINE_FESTIVAL_SCENE_ASSET_SPECS.find(spec => spec.templateId === templateId) ?? null
