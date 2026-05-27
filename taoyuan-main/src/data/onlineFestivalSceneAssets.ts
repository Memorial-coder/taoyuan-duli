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
]

export const getOnlineFestivalSceneAssetSpec = (templateId: string) =>
  ONLINE_FESTIVAL_SCENE_ASSET_SPECS.find(spec => spec.templateId === templateId) ?? null
