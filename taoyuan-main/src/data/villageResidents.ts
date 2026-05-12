export type VillageResidentUnlockRequirement =
  | {
      kind: 'village_project'
      projectId: string
      requirementLabel: string
    }
  | {
      kind: 'special_order_npc'
      npcId: string
      requirementLabel: string
    }
  | {
      kind: 'bonded_spirit'
      requirementLabel: string
    }

export type VillageResidentUnlockContext = {
  completedProjectIds: string[]
  archivedSpecialOrderKeys: string[]
  bondedSpiritIds: string[]
}

export type VillageResidentDef = {
  id: string
  routeLabel: string
  name: string
  title: string
  summary: string
  arrivalSummary: string
  unlockRequirement: VillageResidentUnlockRequirement
  shelfLabel: string
  shelfSummary: string
  dialogueGroupLabel: string
  dialogueSummary: string
  cluePoolLabel: string
  clueSummary: string
  festivalComment: string
  smallEventSummary: string
  linkedSystems: Array<'shop' | 'quest' | 'village' | 'guide' | 'npc'>
}

export const VILLAGE_RESIDENTS: VillageResidentDef[] = [
  {
    id: 'resident_caravan_settler',
    routeLabel: '商队定居',
    name: '驿商阿遥',
    title: '商队驻村人',
    summary: '商路站稳后，第一批愿意在村口久留的行脚商开始把补给、消息和临时摊位带进桃源乡。',
    arrivalSummary: '商队不再只是路过，村口开始有了真正会留下来的生意与人情。',
    unlockRequirement: {
      kind: 'village_project',
      projectId: 'caravan_station_ii',
      requirementLabel: '完成「商队驿站扩建」'
    },
    shelfLabel: '西路行脚货架',
    shelfSummary: '补进沿路常缺的行脚货、便携补给和少量节前周转品。',
    dialogueGroupLabel: '驿站夜话',
    dialogueSummary: '村民会开始聊到外路消息、商队歇脚和谁最近在村口做成了生意。',
    cluePoolLabel: '边贸传闻',
    clueSummary: '更容易收到商路异动、节庆商人和稀有来访前的顺风消息。',
    festivalComment: '节庆夜里，驿站会多挂一排风灯，阿遥会提一句“今年终于像个能留人的村口了”。',
    smallEventSummary: '傍晚偶尔会多出一车紧俏补给，适合顺手补货再回去接单。',
    linkedSystems: ['shop', 'quest', 'village', 'guide']
  },
  {
    id: 'resident_scholar_in_residence',
    routeLabel: '学者驻村',
    name: '闻笺先生',
    title: '驻村抄录人',
    summary: '做过足够像样的学舍委托后，会有愿意常驻的抄录学者留下来，帮村里整理见闻、课簿与人物小传。',
    arrivalSummary: '学舍不再只是空壳设施，而是开始真正产出记录、见闻和可追溯的关系素材。',
    unlockRequirement: {
      kind: 'special_order_npc',
      npcId: 'xue_qin',
      requirementLabel: '完成雪琴的特殊订单'
    },
    shelfLabel: '学舍寄售架',
    shelfSummary: '会寄售抄录纸、见闻册和少量偏研究向的小物件。',
    dialogueGroupLabel: '课后闲谈',
    dialogueSummary: '村民会开始提到谁最近常去学舍、谁留下了新札记，以及哪段关系被大家看在眼里。',
    cluePoolLabel: '抄录见闻',
    clueSummary: '更容易获得礼物线索、人物侧记和带验证指向的纸条补充。',
    festivalComment: '到了节庆，闻笺先生会把今年村里的热闹记成小册，第二年再提起时就不再像第一次那样生疏。',
    smallEventSummary: '偶尔会在学舍门口看到“代抄一页”“补录一段”的小委托，偏轻量但很有生活味。',
    linkedSystems: ['shop', 'quest', 'npc', 'village']
  },
  {
    id: 'resident_mountain_spirit_guest',
    routeLabel: '山灵化人',
    name: '青岚',
    title: '借宿山灵',
    summary: '当你真正和一位隐世灵体结下羁绊后，村里会出现一位愿意偶尔以人形借宿的山灵访客，带来只在近身观察里才看得到的细微回响。',
    arrivalSummary: '这不是又多一个普通 NPC，而是把山野灵性正式拖进村庄生活层。',
    unlockRequirement: {
      kind: 'bonded_spirit',
      requirementLabel: '与任意一位隐世灵体结下羁绊'
    },
    shelfLabel: '山灵寄物台',
    shelfSummary: '偶尔会留下护符材料、异色花枝或只在特殊天气前后出现的细小供物。',
    dialogueGroupLabel: '林泉低语',
    dialogueSummary: '村民会开始提起“那位借宿客”带来的气运变化、奇怪脚印和不太像凡人的作息。',
    cluePoolLabel: '山神兆闻',
    clueSummary: '能把天气窗口、秘地传闻和祝福前兆更自然地接到村里对话中。',
    festivalComment: '节庆时，青岚只会留一句不太像祝辞的话，但第二天总有人说昨夜的灯火像被山风护过。',
    smallEventSummary: '清晨偶尔会在门口看到一枚护符坠片或一条不说明来意的小线索。',
    linkedSystems: ['shop', 'quest', 'npc', 'village', 'guide']
  }
]

export const getVillageResidentById = (id: string) => VILLAGE_RESIDENTS.find(entry => entry.id === id)

export const isVillageResidentUnlocked = (
  resident: VillageResidentDef,
  context: VillageResidentUnlockContext
) => {
  switch (resident.unlockRequirement.kind) {
    case 'village_project':
      return context.completedProjectIds.includes(resident.unlockRequirement.projectId)
    case 'special_order_npc':
      return context.archivedSpecialOrderKeys.includes(`npc:${resident.unlockRequirement.npcId}`)
    case 'bonded_spirit':
      return context.bondedSpiritIds.length > 0
    default:
      return false
  }
}

export const getVillageResidentUnlockHint = (
  resident: VillageResidentDef,
  context: VillageResidentUnlockContext
) => {
  if (isVillageResidentUnlocked(resident, context)) return `${resident.routeLabel}已落地`
  return resident.unlockRequirement.requirementLabel
}
