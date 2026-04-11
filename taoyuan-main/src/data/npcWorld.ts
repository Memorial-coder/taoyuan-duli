import type { NpcState, RelationshipStage, Season, VillagerQuestCategory, Weather, Weekday } from '@/types'

export const RELATIONSHIP_STAGE_ORDER: RelationshipStage[] = ['recognize', 'familiar', 'friend', 'bestie', 'romance', 'married', 'family']

export const RELATIONSHIP_STAGE_META: Record<RelationshipStage, { label: string; description: string }> = {
  recognize: { label: '认识', description: '刚刚互相认识，愿意寒暄几句。' },
  familiar: { label: '熟悉', description: '开始记得你的习惯，愿意分享日常。' },
  friend: { label: '朋友', description: '愿意托付日常小事，也会送来帮助。' },
  bestie: { label: '挚友', description: '会主动照顾你，分享秘密与专属门路。' },
  romance: { label: '恋爱', description: '关系更进一步，互动更加亲密。' },
  married: { label: '婚后', description: '已经组成家庭，开始共同经营生活。' },
  family: { label: '家庭', description: '婚后并迎来孩子，进入稳定的家庭阶段。' }
}

export const getRelationshipStageRank = (stage: RelationshipStage): number => RELATIONSHIP_STAGE_ORDER.indexOf(stage)

export const isRelationshipStageAtLeast = (current: RelationshipStage, required: RelationshipStage): boolean => {
  return getRelationshipStageRank(current) >= getRelationshipStageRank(required)
}

export const getRelationshipStageLabel = (stage: RelationshipStage): string => RELATIONSHIP_STAGE_META[stage].label

export const getRelationshipStageFromState = (
  friendship: number,
  options: Pick<Partial<NpcState>, 'dating' | 'married' | 'zhiji'> & { hasChild?: boolean }
): RelationshipStage => {
  if (options.married) return options.hasChild ? 'family' : 'married'
  if (options.dating) return 'romance'
  if (options.zhiji || friendship >= 2000) return 'bestie'
  if (friendship >= 1000) return 'friend'
  if (friendship >= 250) return 'familiar'
  return 'recognize'
}

export interface NpcScheduleRule {
  from: number
  to: number
  location: string
  summary: string
  weekdays?: Weekday[] | 'all'
  seasons?: Season[] | 'all'
  weathers?: Weather[] | 'all'
}

export interface NpcScheduleStatus {
  available: boolean
  location: string
  summary: string
  reason?: string
  specialDialogue?: string
}

export interface NpcFestivalPresence {
  location: string
  dialogue: string
}

export interface NpcScheduleContext {
  season: Season
  day: number
  hour: number
  weather: Weather
  festivalId?: string | null
}

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const weekdayOf = (day: number): Weekday => WEEKDAYS[(day - 1) % 7]!

const ruleMatches = (rule: NpcScheduleRule, context: NpcScheduleContext): boolean => {
  const weekday = weekdayOf(context.day)
  const weekdayOk = !rule.weekdays || rule.weekdays === 'all' || rule.weekdays.includes(weekday)
  const seasonOk = !rule.seasons || rule.seasons === 'all' || rule.seasons.includes(context.season)
  const weatherOk = !rule.weathers || rule.weathers === 'all' || rule.weathers.includes(context.weather)
  return weekdayOk && seasonOk && weatherOk && context.hour >= rule.from && context.hour < rule.to
}

const GENERIC_SCHEDULE: NpcScheduleRule[] = [
  { from: 6, to: 9, location: '家门口', summary: '清晨整理院子，和邻里打招呼。' },
  { from: 9, to: 17, location: '村中作坊', summary: '白天忙着做工或照看自己的营生。' },
  { from: 17, to: 21, location: '村口茶摊', summary: '傍晚会到茶摊或小广场歇脚。' }
]

export const NPC_WORLD_SCHEDULES: Record<string, NpcScheduleRule[]> = {
  chen_bo: [
    { from: 6, to: 9, location: '万物铺后院', summary: '清点货物，准备开门。' },
    { from: 9, to: 18, location: '万物铺柜台', summary: '正在招呼客人，顺便留意村里的新鲜事。' },
    { from: 18, to: 21, location: '村口茶摊', summary: '收摊后会在茶摊坐一会儿。' }
  ],
  liu_niang: [
    { from: 7, to: 11, location: '村长家书房', summary: '早上多半在读诗或整理家里的信札。' },
    { from: 11, to: 17, location: '村长家回廊', summary: '雨天或冬日多半在回廊烤火，顺便整理花帖。', weathers: ['rainy', 'stormy', 'snowy'] },
    { from: 11, to: 17, location: '村长家回廊', summary: '冬日会在回廊边烤火边看信札。', seasons: ['winter'] },
    { from: 11, to: 17, location: '桃花树下', summary: '喜欢在树下散步，顺便和村民聊天。', seasons: ['spring', 'summer', 'autumn'] },
    { from: 17, to: 21, location: '河边石桥', summary: '傍晚常去桥边看水。' }
  ],
  a_shi: [
    { from: 6, to: 12, location: '矿洞入口', summary: '一早就去矿洞附近巡看岩壁。', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
    { from: 12, to: 17, location: '铁匠铺后场', summary: '会把挑出来的矿石送去整理。', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
    { from: 18, to: 21, location: '村口石阶', summary: '黄昏时会安静地坐在石阶上。' }
  ],
  qiu_yue: [
    { from: 6, to: 11, location: '渔具铺檐下', summary: '下雨时会在铺子门口修鱼线、挑鱼漂。', weathers: ['rainy', 'stormy'] },
    { from: 6, to: 11, location: '溪边钓点', summary: '清晨在溪边看水色和鱼讯。', weathers: ['sunny', 'windy', 'green_rain'] },
    { from: 11, to: 17, location: '渔具铺', summary: '白天守在渔具铺，兴致来时会临时开讲钓鱼诀窍。' },
    { from: 17, to: 22, location: '渔火棚下', summary: '冬天傍晚多在渔火棚下避风，看河面起雾。', seasons: ['winter'] },
    { from: 17, to: 22, location: '河岸栈桥', summary: '晚霞最美的时候总在栈桥吹风。' }
  ],
  lin_lao: [
    { from: 7, to: 11, location: '药铺内室', summary: '雨雪天会在内室拣药、写方子。', weathers: ['rainy', 'stormy', 'snowy'] },
    { from: 7, to: 11, location: '药圃', summary: '清晨在药圃辨草、晒药。', weathers: ['sunny', 'windy', 'green_rain'] },
    { from: 9, to: 17, location: '药铺', summary: '看诊、抓药、教钱娘认药。', weathers: 'all' },
    { from: 17, to: 20, location: '茶楼角落', summary: '傍晚常在茶楼休息，听人闲聊。' }
  ],
  xiao_man: [
    { from: 8, to: 12, location: '木匠工坊', summary: '跟着赵木匠学手艺，时不时偷偷打盹。', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
    { from: 12, to: 16, location: '木匠工坊火盆边', summary: '冬天午后会缩在火盆边打磨木件。', seasons: ['winter'] },
    { from: 12, to: 16, location: '村东空地', summary: '午后会到空地试做小东西。' },
    { from: 16, to: 20, location: '广场边', summary: '黄昏最爱凑热闹。' }
  ],
  chun_lan: [
    { from: 7, to: 10, location: '茶庄后院', summary: '早上烘茶、拣茶，身上总带着淡淡茶香。' },
    { from: 10, to: 17, location: '茶庄', summary: '白天在茶庄招待客人。' },
    { from: 17, to: 20, location: '竹篱小径', summary: '傍晚会拎着茶篮散步。' }
  ],
  xue_qin: [
    { from: 10, to: 14, location: '画室窗边', summary: '光线最好的时候会专心作画。' },
    { from: 14, to: 18, location: '瀑布观景台', summary: '午后常去写生。' },
    { from: 18, to: 21, location: '画室', summary: '晚上回去整理颜料与画稿。' }
  ],
  su_su: [
    { from: 8, to: 12, location: '绸缎庄前厅', summary: '招呼客人、量体裁衣。' },
    { from: 12, to: 17, location: '绣架旁', summary: '午后最适合细致的针线活。' },
    { from: 17, to: 20, location: '绸缎庄门廊', summary: '收工后常坐在门廊整理布料。' }
  ],
  hong_dou: [
    { from: 10, to: 15, location: '酒庄前厅', summary: '白天忙着招呼酒客、搬酒坛。' },
    { from: 15, to: 19, location: '酒窖', summary: '下午多半在酒窖盯发酵。' },
    { from: 19, to: 23, location: '酒庄门外', summary: '夜里最爱靠着门柱吹风喝两口。' }
  ],
  dan_qing: [
    { from: 8, to: 11, location: '茶楼二层', summary: '早上在茶楼抄书作诗。' },
    { from: 11, to: 16, location: '私塾院角', summary: '会去旁听周秀才讲课。' },
    { from: 16, to: 21, location: '河边长椅', summary: '傍晚喜欢在长椅上写字。' }
  ],
  a_tie: [
    { from: 7, to: 12, location: '铁匠铺炉边', summary: '一早就在拉风箱、敲胚子。', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
    { from: 12, to: 17, location: '铁匠铺后场', summary: '午后帮师父搬料、淬火。' },
    { from: 17, to: 20, location: '村边井台', summary: '收工后会在井边冲掉铁灰。' }
  ],
  yun_fei: [
    { from: 6, to: 12, location: '后山猎径', summary: '一早进山巡线。', weekdays: ['tue', 'thu', 'sat', 'sun'] },
    { from: 12, to: 16, location: '镖局前院', summary: '中午会回镖局整备兵器。' },
    { from: 16, to: 20, location: '山口哨点', summary: '傍晚在山口看风。' }
  ],
  da_niu: [
    { from: 6, to: 10, location: '牛棚里', summary: '寒天或雨雪时更早就会待在棚里给牲口添草。', weathers: ['rainy', 'stormy', 'snowy'] },
    { from: 6, to: 10, location: '牧场围栏', summary: '天刚亮就在赶牛喂草。', weathers: ['sunny', 'windy', 'green_rain'] },
    { from: 10, to: 16, location: '牧草地', summary: '白天忙着照看牲口。' },
    { from: 16, to: 19, location: '牛棚门口', summary: '傍晚数着今天的产奶量。' }
  ],
  mo_bai: [
    { from: 12, to: 16, location: '茶楼角落', summary: '午后在茶楼试曲。' },
    { from: 16, to: 19, location: '茶楼临窗位', summary: '雨天会改在临窗处听雨试弦。', weathers: ['rainy', 'stormy', 'snowy'] },
    { from: 16, to: 19, location: '桥边亭子', summary: '黄昏时会到亭子里练琴。' },
    { from: 19, to: 23, location: '茶楼临窗位', summary: '冬夜常留在茶楼听风，慢慢磨新曲。', seasons: ['winter'] },
    { from: 19, to: 23, location: '月下河岸', summary: '夜里最容易写出新曲。' }
  ],
  wang_dashen: [
    { from: 6, to: 10, location: '灶房', summary: '天不亮就开始备菜。' },
    { from: 10, to: 15, location: '伙房后灶', summary: '雨天会把摊子收进后灶，继续忙活席面。', weathers: ['rainy', 'stormy', 'snowy'] },
    { from: 10, to: 15, location: '村里伙房', summary: '给村里人张罗饭食。' },
    { from: 15, to: 19, location: '菜地边', summary: '午后顺便照看自己的小菜畦。' }
  ],
  zhao_mujiang: [
    { from: 7, to: 12, location: '木匠工坊', summary: '清晨就在工坊干活。', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
    { from: 12, to: 17, location: '工坊后场', summary: '午后在后场晾木、刨木。' },
    { from: 17, to: 19, location: '工坊门口', summary: '收工后仍会站在门口盯小满收拾。' }
  ],
  sun_tiejiang: [
    { from: 7, to: 12, location: '铁匠铺', summary: '火炉一响，人也跟着精神了。', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
    { from: 12, to: 17, location: '铁匠铺后场', summary: '午后继续打铁，偶尔骂阿铁两句。' },
    { from: 17, to: 19, location: '酒庄门口', summary: '收工后爱去喝两口。' }
  ],
  liu_cunzhang: [
    { from: 8, to: 12, location: '村长厅堂', summary: '处理村务、接待村民。', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'] },
    { from: 12, to: 17, location: '广场边', summary: '午后巡视村里。', weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'] },
    { from: 17, to: 20, location: '村长家门前', summary: '傍晚会在家门口听柳娘说话。' }
  ]
}

export const NPC_FESTIVAL_PRESENCE: Record<string, Record<string, NpcFestivalPresence>> = {
  spring_festival: {
    chen_bo: { location: '广场祭台', dialogue: '今天要替大家祈个好年景，等会儿别忘了来领种子。' },
    liu_niang: { location: '桃花树下', dialogue: '红绸一挂，像是把整座村子的心愿都系上去了。' },
    xiao_man: { location: '广场边鼓架', dialogue: '我今天负责敲鼓！你看我像不像有模有样的祭官？' }
  },
  hua_chao: {
    liu_niang: { location: '桃花树下花案', dialogue: '今天是百花生辰，花枝也该被认真对待。你看这条花绸，好不好看？' },
    qiu_yue: { location: '溪边花棚', dialogue: '我替溪边的花也扎了小灯签，风一吹就像在点头。' },
    xiao_man: { location: '花径边', dialogue: '我本来只想帮忙搬花盆，结果被抓来系花环了……不过还挺好玩。' }
  },
  shang_si: {
    qiu_yue: { location: '溪边祓禊处', dialogue: '今天大家都来溪边净手祈福，你也别总站着，水可凉快了。' },
    a_shi: { location: '溪石旁', dialogue: '……踏青也好。山里的风，比矿洞里透气。' },
    liu_niang: { location: '草坡席边', dialogue: '春光这样好，不拿来散心就太可惜了。' }
  },
  summer_lantern: {
    qiu_yue: { location: '河岸灯棚', dialogue: '灯都漂出去了，接下来就看谁能先钓上第一条鱼啦！' },
    mo_bai: { location: '河边小台', dialogue: '灯火映在水面上，琴声也会比平日柔一点。' },
    dan_qing: { location: '桥边观灯处', dialogue: '今晚的河灯很多，像一页会流动的诗。' }
  },
  autumn_harvest: {
    chen_bo: { location: '农展会评台', dialogue: '把今年最得意的收成拿出来吧，桃源村可不缺识货的人。' },
    wang_dashen: { location: '丰收宴长桌', dialogue: '宴席都备好了，别光顾着看展品，记得来吃饭！' },
    da_niu: { location: '牲口展示栏', dialogue: '今年的牛膘肥体壮，村里的日子是真越过越好了。' }
  },
  winter_new_year: {
    liu_niang: { location: '村长家正厅', dialogue: '今晚就别一个人待着了，来和大家一起守岁。' },
    a_shi: { location: '院门边', dialogue: '……这是给你的红包。别嫌我说得少。' },
    chen_bo: { location: '年夜饭主桌', dialogue: '新年饭得热热闹闹地吃，人也得热热闹闹地过。' }
  },
  yuan_ri: {
    chen_bo: { location: '村口牌坊', dialogue: '新年第一天，图个吉利，见面都要说好话。' }
  },
  duan_wu: {
    qiu_yue: { location: '河岸龙舟棚', dialogue: '船桨都排好了，就等你来上船！' },
    a_shi: { location: '龙舟边', dialogue: '今天不下矿，来划船。……也不坏。' }
  },
  qi_xi: {
    liu_niang: { location: '灯谜长廊', dialogue: '这条谜我写得最难，你若猜出来，我就再告诉你一个秘密。' },
    dan_qing: { location: '花灯架旁', dialogue: '灯下读谜，很像旧书里写的良夜。' }
  },
  dou_cha: {
    chun_lan: { location: '斗茶席主案', dialogue: '看茶色、闻茶香、品回甘，差一点都不算赢。你也来试一盏？' },
    lin_lao: { location: '泉水炉边', dialogue: '水滚三分最妙，火候重了，茶心就乱了。' },
    chen_bo: { location: '评茶长桌', dialogue: '今日不谈买卖，只谈哪一盏更像桃源夏天的味道。' }
  },
  dong_zhi: {
    wang_dashen: { location: '堂屋案板', dialogue: '快来搭把手，今天谁都不许空着手站着！' },
    su_su: { location: '热汤锅旁', dialogue: '我包得慢，但每个褶子都要捏得整整齐齐。' }
  },
  zhong_qiu: {
    mo_bai: { location: '赏月台', dialogue: '月光这样亮，连琴弦都像被镀了一层银。今晚别急着走。' },
    liu_niang: { location: '桂树长桌', dialogue: '月饼我替你留了一块，等会儿一起看月亮吧。' },
    dan_qing: { location: '观月廊', dialogue: '今夜的圆月，像一首不必写完就能懂的诗。' }
  },
  chong_yang: {
    lin_lao: { location: '登高台阶', dialogue: '重阳宜登高，也宜敬老。来，陪我站一会儿，看看村子的秋色。' },
    a_shi: { location: '投壶场边', dialogue: '我不擅长这些热闹玩意儿……但既然来了，就投一支试试。' },
    xiao_man: { location: '菊花棚前', dialogue: '我练了好久投壶，今天总该让我中一回吧！' }
  },
  la_ba: {
    wang_dashen: { location: '粥棚大锅', dialogue: '腊八粥要慢慢熬，火急了，香气可就散了。' },
    chen_bo: { location: '粥会长桌', dialogue: '今年的谷子甜，熬出来的粥也格外暖胃。' },
    liu_niang: { location: '分粥案前', dialogue: '别急着走，人人都有一碗，连你的那份我也看着呢。' }
  },
  nian_mo: {
    a_shi: { location: '烟花架旁', dialogue: '火线我都看过了，放心，今夜的烟花会很稳。' },
    qiu_yue: { location: '河边烟花位', dialogue: '等烟花落进水里那一下最好看，你记得抬头。' },
    xiao_man: { location: '广场空地', dialogue: '等会儿那支最大的烟花是我帮着搬的！可别错过。' }
  },
  qiu_yuan: {
    xiao_man: { location: '放鸢草坡', dialogue: '你快看！我这只风筝差一点就要飞到云里去了！' },
    a_shi: { location: '坡顶风口', dialogue: '风今天正好，线别松得太快，不然一会儿就偏了。' },
    liu_niang: { location: '观鸢长席', dialogue: '秋风把纸鸢一只只托上去，像把人的愿望也带远了。' }
  }
}

const getFallbackScheduleStatus = (context: NpcScheduleContext): NpcScheduleStatus => {
  const rule = GENERIC_SCHEDULE.find(entry => ruleMatches(entry, context))
  if (rule) {
    return { available: true, location: rule.location, summary: rule.summary }
  }

  if (context.weather === 'stormy' || context.weather === 'snowy') {
    return { available: true, location: '家中', summary: '天气不好，今天大多待在室内。', reason: '因为天气原因在家中活动。' }
  }

  return { available: false, location: '家中', summary: '今天已经回去休息了。', reason: context.hour < 8 ? '还没出门。' : '已经回家了。' }
}

export const getNpcScheduleStatus = (npcId: string, context: NpcScheduleContext): NpcScheduleStatus => {
  if (context.festivalId) {
    const festivalPresence = NPC_FESTIVAL_PRESENCE[context.festivalId]?.[npcId]
    if (festivalPresence) {
      return {
        available: true,
        location: festivalPresence.location,
        summary: '今天是节日，正待在专属活动区域。',
        specialDialogue: festivalPresence.dialogue
      }
    }
  }

  const rules = NPC_WORLD_SCHEDULES[npcId]
  if (!rules || rules.length === 0) return getFallbackScheduleStatus(context)

  const matched = rules.find(rule => ruleMatches(rule, context))
  if (matched) {
    return { available: true, location: matched.location, summary: matched.summary }
  }

  if (context.weather === 'stormy') {
    return { available: true, location: '屋檐下', summary: '风雨太大，今天改在室内或屋檐下活动。', reason: '因为雷雨改变了行程。' }
  }
  if (context.weather === 'snowy') {
    return { available: true, location: '火炉边', summary: '天气寒冷，今天更愿意待在暖和的地方。', reason: '因为下雪而提早回屋。' }
  }

  const nextRule = rules.find(rule => context.hour < rule.from)
  if (nextRule) {
    return {
      available: false,
      location: nextRule.location,
      summary: `稍晚会去${nextRule.location}。`,
      reason: `一般要到${nextRule.from}:00之后才会出现。`
    }
  }

  return { available: false, location: '家中', summary: '今天的行程已经结束。', reason: '已经回家休息了。' }
}

export interface NpcScheduleTimelineEntry {
  key: string
  label: string
  from: number
  to: number
  location: string
  summary: string
  active: boolean
  tags: string[]
}

const SEASON_LABELS: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬'
}

const WEATHER_LABELS: Record<Weather, string> = {
  sunny: '晴',
  rainy: '雨',
  stormy: '雷雨',
  snowy: '雪',
  windy: '风',
  green_rain: '绿雨'
}

const formatHourLabel = (hour: number): string => `${String(hour).padStart(2, '0')}:00`

const ruleAppliesForDay = (rule: NpcScheduleRule, context: NpcScheduleContext): boolean => {
  const weekday = weekdayOf(context.day)
  const weekdayOk = !rule.weekdays || rule.weekdays === 'all' || rule.weekdays.includes(weekday)
  const seasonOk = !rule.seasons || rule.seasons === 'all' || rule.seasons.includes(context.season)
  const weatherOk = !rule.weathers || rule.weathers === 'all' || rule.weathers.includes(context.weather)
  return weekdayOk && seasonOk && weatherOk
}

const getRuleTags = (rule: NpcScheduleRule): string[] => {
  const tags: string[] = []
  if (rule.seasons && rule.seasons !== 'all') {
    tags.push(...rule.seasons.map(season => `${SEASON_LABELS[season]}季`))
  }
  if (rule.weathers && rule.weathers !== 'all') {
    tags.push(...rule.weathers.map(weather => WEATHER_LABELS[weather]))
  }
  return [...new Set(tags)]
}

export const getNpcScheduleTimeline = (npcId: string, context: NpcScheduleContext): NpcScheduleTimelineEntry[] => {
  if (context.festivalId) {
    const festivalPresence = NPC_FESTIVAL_PRESENCE[context.festivalId]?.[npcId]
    if (festivalPresence) {
      return [
        {
          key: `${npcId}_festival_${context.festivalId}`,
          label: '节日行程',
          from: 8,
          to: 20,
          location: festivalPresence.location,
          summary: '今天参加节日活动，日程会围绕庆典安排。',
          active: true,
          tags: ['节日']
        }
      ]
    }
  }

  const sourceRules = NPC_WORLD_SCHEDULES[npcId] ?? GENERIC_SCHEDULE
  const rules = sourceRules.filter(rule => ruleAppliesForDay(rule, context)).sort((a, b) => a.from - b.from)
  if (rules.length === 0) {
    return [
      {
        key: `${npcId}_fallback`,
        label: `${formatHourLabel(8)} - ${formatHourLabel(20)}`,
        from: 8,
        to: 20,
        location: context.weather === 'stormy' || context.weather === 'snowy' ? '家中' : '村中',
        summary: context.weather === 'stormy' || context.weather === 'snowy' ? '天气不好，今天大多待在室内。' : '今天会在村里四处活动。',
        active: true,
        tags: [WEATHER_LABELS[context.weather]]
      }
    ]
  }

  return rules.map((rule, index) => ({
    key: `${npcId}_${rule.from}_${rule.to}_${index}`,
    label: `${formatHourLabel(rule.from)} - ${formatHourLabel(rule.to)}`,
    from: rule.from,
    to: rule.to,
    location: rule.location,
    summary: rule.summary,
    active: context.hour >= rule.from && context.hour < rule.to,
    tags: getRuleTags(rule)
  }))
}

export const getNpcNextScheduleText = (npcId: string, context: NpcScheduleContext): string | null => {
  if (context.festivalId) {
    const festivalPresence = NPC_FESTIVAL_PRESENCE[context.festivalId]?.[npcId]
    if (festivalPresence) return `今天整天都会在${festivalPresence.location}参与节日活动。`
  }

  const rules = (NPC_WORLD_SCHEDULES[npcId] ?? GENERIC_SCHEDULE)
    .filter(rule => ruleAppliesForDay(rule, context))
    .sort((a, b) => a.from - b.from)

  const nextRule = rules.find(rule => context.hour < rule.from)
  if (nextRule) {
    return `${formatHourLabel(nextRule.from)}后会去${nextRule.location}。`
  }

  const currentRule = rules.find(rule => context.hour >= rule.from && context.hour < rule.to)
  if (currentRule) {
    return `这会儿多半在${currentRule.location}。`
  }

  return rules.length > 0 ? '今天的固定行程已经差不多结束了。' : null
}

export interface NpcRelationshipBenefitDef {
  id: string
  npcId: string
  minStage: RelationshipStage
  type: 'shop_discount' | 'recipe' | 'item' | 'clue' | 'quest_unlock'
  summary: string
  value?: number
  recipeId?: string
  itemReward?: { itemId: string; quantity: number }
  clueText?: string
}

export const NPC_RELATIONSHIP_BENEFITS: NpcRelationshipBenefitDef[] = [
  { id: 'chen_bo_discount_1', npcId: 'chen_bo', minStage: 'familiar', type: 'shop_discount', value: 0.03, summary: '万物铺熟客折扣 -3%' },
  { id: 'chen_bo_discount_2', npcId: 'chen_bo', minStage: 'friend', type: 'shop_discount', value: 0.06, summary: '万物铺老朋友折扣 -6%' },
  { id: 'chen_bo_quest_unlock', npcId: 'chen_bo', minStage: 'friend', type: 'quest_unlock', summary: '陈伯开始把更要紧的跑腿活交给你。' },
  {
    id: 'liu_niang_clue',
    npcId: 'liu_niang',
    minStage: 'friend',
    type: 'clue',
    summary: '柳娘愿意向你谈起村长家的旧温室。',
    clueText: '柳娘悄悄提到，村长家后院曾有一间试种稀有花木的小温室，若再修整或许能成为新的建筑灵感。'
  },
  {
    id: 'a_shi_item',
    npcId: 'a_shi',
    minStage: 'friend',
    type: 'item',
    itemReward: { itemId: 'iron_ore', quantity: 4 },
    summary: '阿石会把挑好的铁矿留几块给你。'
  },
  {
    id: 'a_shi_quest_unlock',
    npcId: 'a_shi',
    minStage: 'bestie',
    type: 'quest_unlock',
    summary: '阿石开始把更要紧的矿料筹备和支架差事交给你。'
  },
  {
    id: 'a_shi_clue',
    npcId: 'a_shi',
    minStage: 'bestie',
    type: 'clue',
    summary: '阿石告诉你矿洞支架与储矿间的改造线索。',
    clueText: '阿石提醒你：农场若有稳固的矿料棚和支架，能更方便地囤放矿材与工具。'
  },
  { id: 'qiu_yue_quest_unlock', npcId: 'qiu_yue', minStage: 'familiar', type: 'quest_unlock', summary: '秋月开始给你渔获和节庆准备委托。' },
  { id: 'qiu_yue_item', npcId: 'qiu_yue', minStage: 'friend', type: 'item', itemReward: { itemId: 'standard_bait', quantity: 8 }, summary: '秋月送来一包顺手的鱼饵。' },
  { id: 'qiu_yue_discount_1', npcId: 'qiu_yue', minStage: 'friend', type: 'shop_discount', value: 0.05, summary: '渔具铺熟客价 -5%' },
  { id: 'lin_lao_discount_1', npcId: 'lin_lao', minStage: 'familiar', type: 'shop_discount', value: 0.03, summary: '药铺熟客折扣 -3%' },
  {
    id: 'lin_lao_clue',
    npcId: 'lin_lao',
    minStage: 'friend',
    type: 'clue',
    summary: '林老愿意分享药圃暖棚与养生房的想法。',
    clueText: '林老说冬日若想稳定育药，最好搭一间向阳暖棚，旁边还要有煎药休息的地方。'
  },
  { id: 'su_su_discount_1', npcId: 'su_su', minStage: 'familiar', type: 'shop_discount', value: 0.04, summary: '绸缎庄熟客折扣 -4%' },
  {
    id: 'su_su_clue',
    npcId: 'su_su',
    minStage: 'bestie',
    type: 'clue',
    summary: '素素提到布房与裁衣角落的布置方式。',
    clueText: '素素建议：若农舍添一间布房，不但能收纳布料，还能把送礼和回礼都准备得更体面。'
  },
  { id: 'sun_tiejiang_discount_1', npcId: 'sun_tiejiang', minStage: 'friend', type: 'shop_discount', value: 0.05, summary: '铁匠铺熟人价 -5%' },
  { id: 'yun_fei_discount_1', npcId: 'yun_fei', minStage: 'friend', type: 'shop_discount', value: 0.05, summary: '镖局熟人价 -5%' },
  { id: 'wang_dashen_quest_unlock', npcId: 'wang_dashen', minStage: 'friend', type: 'quest_unlock', summary: '王大婶开始把席面和节庆准备托付给你。' },
  { id: 'zhao_mujiang_quest_unlock', npcId: 'zhao_mujiang', minStage: 'friend', type: 'quest_unlock', summary: '赵木匠开始让你帮忙筹备木工相关事务。' },
  { id: 'zhao_mujiang_item', npcId: 'zhao_mujiang', minStage: 'bestie', type: 'item', itemReward: { itemId: 'wood', quantity: 15 }, summary: '赵木匠额外留给你一批顺手木料。' },
  { id: 'dan_qing_quest_unlock', npcId: 'dan_qing', minStage: 'friend', type: 'quest_unlock', summary: '丹青开始请你帮忙张罗文会和节庆差事。' },
  { id: 'mo_bai_item', npcId: 'mo_bai', minStage: 'bestie', type: 'item', itemReward: { itemId: 'tea', quantity: 2 }, summary: '墨白送你两包润嗓的好茶。' },
  {
    id: 'wang_dashen_recipe',
    npcId: 'wang_dashen',
    minStage: 'friend',
    type: 'recipe',
    recipeId: 'social_tea',
    summary: '王大婶愿意把适合宴客的茶点方子讲给你。'
  },
  { id: 'hong_dou_quest_unlock', npcId: 'hong_dou', minStage: 'familiar', type: 'quest_unlock', summary: '红豆开始把酒坛搬运和药材杂活托付给你。' },
  { id: 'hong_dou_item', npcId: 'hong_dou', minStage: 'friend', type: 'item', itemReward: { itemId: 'osmanthus_wine', quantity: 1 }, summary: '红豆悄悄塞给你一壶自酿的桂花酿。' },
  {
    id: 'hong_dou_clue',
    npcId: 'hong_dou',
    minStage: 'bestie',
    type: 'clue',
    summary: '红豆提起酒坊边可以搭建的小储藏间。',
    clueText: '红豆说，酒坊旁若有间阴凉的小储藏室，陈酒和药材都能放得更久。'
  },
  { id: 'chun_lan_quest_unlock', npcId: 'chun_lan', minStage: 'familiar', type: 'quest_unlock', summary: '春兰开始请你帮忙采集茶材和节庆筹备。' },
  { id: 'chun_lan_discount_1', npcId: 'chun_lan', minStage: 'friend', type: 'shop_discount', value: 0.04, summary: '茶庄熟客价 -4%' },
  { id: 'chun_lan_item', npcId: 'chun_lan', minStage: 'bestie', type: 'item', itemReward: { itemId: 'osmanthus_tea', quantity: 1 }, summary: '春兰送来一份她亲手窨制的桂花茶。' },
  { id: 'xue_qin_quest_unlock', npcId: 'xue_qin', minStage: 'familiar', type: 'quest_unlock', summary: '雪琴开始请你帮忙跑腿和节庆布置。' },
  {
    id: 'xue_qin_clue',
    npcId: 'xue_qin',
    minStage: 'friend',
    type: 'clue',
    summary: '雪琴提到画室旁的观景台适合改造。',
    clueText: '雪琴说，若农舍附近能有一处高台或观景角，她最愿意在那里为你画一幅像。'
  },
  { id: 'xue_qin_item', npcId: 'xue_qin', minStage: 'bestie', type: 'item', itemReward: { itemId: 'pine_incense', quantity: 2 }, summary: '雪琴送来两支她常用的松香，说作画时点着能静心。' },
  { id: 'sun_tiejiang_quest_unlock', npcId: 'sun_tiejiang', minStage: 'familiar', type: 'quest_unlock', summary: '孙铁匠开始把矿料采购和跑腿活托付给你。' },
  { id: 'sun_tiejiang_item', npcId: 'sun_tiejiang', minStage: 'bestie', type: 'item', itemReward: { itemId: 'iron_bar', quantity: 3 }, summary: '孙铁匠多锻了几块铁锭，顺手递给你。' },
  { id: 'yun_fei_quest_unlock', npcId: 'yun_fei', minStage: 'familiar', type: 'quest_unlock', summary: '云飞开始把镖局跑腿和物资采集托付给你。' },
  {
    id: 'yun_fei_clue',
    npcId: 'yun_fei',
    minStage: 'bestie',
    type: 'clue',
    summary: '云飞提起镖局仓房的改造想法。',
    clueText: '云飞说，若农舍附近有间结实的武器架和仓房，他可以帮你留意稀有武器材料。'
  }
]

export const getNpcBenefitSummaries = (npcId: string, stage: RelationshipStage): string[] => {
  return NPC_RELATIONSHIP_BENEFITS.filter(benefit => benefit.npcId === npcId && isRelationshipStageAtLeast(stage, benefit.minStage)).map(
    benefit => benefit.summary
  )
}

export const getNpcShopDiscount = (npcId: string, stage: RelationshipStage): number => {
  return NPC_RELATIONSHIP_BENEFITS.filter(
    benefit => benefit.npcId === npcId && benefit.type === 'shop_discount' && isRelationshipStageAtLeast(stage, benefit.minStage)
  ).reduce((max, benefit) => Math.max(max, benefit.value ?? 0), 0)
}

export interface NpcGiftReturnDef {
  minStage: RelationshipStage
  chance: number
  itemId: string
  quantity: number
  summary: string
}

export const NPC_GIFT_RETURNS: Record<string, NpcGiftReturnDef[]> = {
  chen_bo: [{ minStage: 'friend', chance: 0.2, itemId: 'tea', quantity: 1, summary: '陈伯塞给你一包茶叶。' }],
  liu_niang: [{ minStage: 'friend', chance: 0.2, itemId: 'osmanthus', quantity: 1, summary: '柳娘回赠了一枝带香气的桂花。' }],
  a_shi: [{ minStage: 'bestie', chance: 0.18, itemId: 'iron_ore', quantity: 2, summary: '阿石默默把两块矿石塞到你手里。' }],
  qiu_yue: [{ minStage: 'friend', chance: 0.25, itemId: 'standard_bait', quantity: 4, summary: '秋月反手送你一小包鱼饵。' }],
  lin_lao: [{ minStage: 'friend', chance: 0.18, itemId: 'herb', quantity: 2, summary: '林老回赠了两味草药。' }],
  xiao_man: [{ minStage: 'friend', chance: 0.2, itemId: 'wood', quantity: 5, summary: '小满说这是他今天削剩下的好木料。' }],
  su_su: [{ minStage: 'friend', chance: 0.15, itemId: 'cloth', quantity: 1, summary: '素素回赠了一小块试样布。' }],
  da_niu: [{ minStage: 'friend', chance: 0.22, itemId: 'hay', quantity: 5, summary: '大牛开心地送来一捆干草。' }],
  mo_bai: [{ minStage: 'bestie', chance: 0.15, itemId: 'tea', quantity: 1, summary: '墨白递来一包能润嗓的好茶。' }],
  hong_dou: [{ minStage: 'friend', chance: 0.2, itemId: 'osmanthus_wine', quantity: 1, summary: '红豆笑着塞给你一小壶自酿桂花酿。' }],
  chun_lan: [{ minStage: 'friend', chance: 0.22, itemId: 'green_tea_drink', quantity: 1, summary: '春兰递来一杯刚泡好的绿茶。' }],
  xue_qin: [{ minStage: 'friend', chance: 0.18, itemId: 'pine_incense', quantity: 1, summary: '雪琴回赠了一支松香，说画画时点着最好。' }],
  dan_qing: [{ minStage: 'friend', chance: 0.18, itemId: 'osmanthus', quantity: 2, summary: '丹青顺手折了两枝桂花给你。' }],
  yun_fei: [{ minStage: 'friend', chance: 0.2, itemId: 'copper_bar', quantity: 2, summary: '云飞说这是镖局余下的铜料，给你备用。' }],
  sun_tiejiang: [{ minStage: 'friend', chance: 0.2, itemId: 'copper_bar', quantity: 2, summary: '孙铁匠多打了几块铜锭，让你拿去用。' }]
}

export const getNpcGiftReturn = (npcId: string, stage: RelationshipStage): NpcGiftReturnDef | null => {
  const pool = (NPC_GIFT_RETURNS[npcId] ?? []).filter(entry => isRelationshipStageAtLeast(stage, entry.minStage))
  if (pool.length === 0) return null
  const pick = pool[Math.floor(Math.random() * pool.length)]!
  return Math.random() < pick.chance ? pick : null
}

export const getNpcGiftReturnSummaries = (npcId: string, stage: RelationshipStage): string[] => {
  return (NPC_GIFT_RETURNS[npcId] ?? [])
    .filter(entry => isRelationshipStageAtLeast(stage, entry.minStage))
    .map(entry => `${RELATIONSHIP_STAGE_META[entry.minStage].label}起：${entry.summary}`)
}

export const getNpcNextBenefitSummaries = (npcId: string, stage: RelationshipStage): string[] => {
  const lockedBenefits = NPC_RELATIONSHIP_BENEFITS.filter(
    benefit => benefit.npcId === npcId && !isRelationshipStageAtLeast(stage, benefit.minStage)
  )

  if (lockedBenefits.length === 0) return []

  const nextStage = lockedBenefits
    .map(benefit => benefit.minStage)
    .sort((a, b) => getRelationshipStageRank(a) - getRelationshipStageRank(b))[0]

  if (!nextStage) return []

  return lockedBenefits
    .filter(benefit => benefit.minStage === nextStage)
    .map(benefit => `${RELATIONSHIP_STAGE_META[nextStage].label}：${benefit.summary}`)
}

export const NPC_RELATIONSHIP_FOCUS: Record<string, string[]> = {
  chen_bo: ['商路人脉', '商店折扣', '紧要委托'],
  liu_niang: ['温室线索', '节庆人脉', '生活情报'],
  a_shi: ['矿料门路', '建造线索', '采矿委托'],
  qiu_yue: ['渔具优惠', '鱼饵补给', '渔业委托'],
  lin_lao: ['药铺折扣', '药材支持', '养生暖棚'],
  su_su: ['布料门路', '绸缎优惠', '裁衣线索'],
  sun_tiejiang: ['铁匠折扣', '锻造资源', '矿料委托'],
  yun_fei: ['镖局折扣', '护送物资', '仓房线索'],
  wang_dashen: ['席面委托', '宴客菜谱', '料理筹备'],
  hong_dou: ['酒饮补给', '酒坊线索', '跑腿杂活'],
  chun_lan: ['茶庄折扣', '茶饮补给', '茶材采集'],
  xue_qin: ['画材线索', '节庆布置', '静心香品'],
  zhao_mujiang: ['木工委托', '工坊布置', '木料支持'],
  dan_qing: ['文会委托', '节庆筹备', '雅趣往来'],
  mo_bai: ['夜曲雅集', '润嗓茶礼', '节庆演出'],
  xiao_man: ['木工跑腿', '节庆帮工', '日常补给'],
  da_niu: ['牧场跑腿', '草料支持', '牲畜照看']
}

export const getNpcRelationshipFocusLabels = (npcId: string): string[] => {
  return NPC_RELATIONSHIP_FOCUS[npcId] ?? []
}

export const SHOP_NPC_RELATION_MAP: Record<string, string> = {
  wanwupu: 'chen_bo',
  tiejiangpu: 'sun_tiejiang',
  biaoju: 'yun_fei',
  yugupu: 'qiu_yue',
  yaopu: 'lin_lao',
  chouduanzhuang: 'su_su'
}

export const NPC_VILLAGER_QUEST_PROFILES: Record<string, { categories: VillagerQuestCategory[] }> = {
  chen_bo: { categories: ['errand', 'festival_prep'] },
  liu_niang: { categories: ['festival_prep', 'gathering'] },
  a_shi: { categories: ['gathering', 'errand'] },
  qiu_yue: { categories: ['fishing', 'festival_prep'] },
  lin_lao: { categories: ['gathering', 'cooking'] },
  xiao_man: { categories: ['errand', 'festival_prep'] },
  wang_dashen: { categories: ['cooking', 'festival_prep'] },
  zhao_mujiang: { categories: ['errand', 'gathering'] },
  su_su: { categories: ['errand', 'festival_prep'] },
  da_niu: { categories: ['gathering', 'errand'] },
  dan_qing: { categories: ['errand', 'festival_prep'] },
  mo_bai: { categories: ['festival_prep', 'errand'] },
  hong_dou: { categories: ['errand', 'gathering'] },
  chun_lan: { categories: ['gathering', 'festival_prep'] },
  xue_qin: { categories: ['errand', 'festival_prep'] },
  yun_fei: { categories: ['errand', 'gathering'] },
  sun_tiejiang: { categories: ['gathering', 'errand'] }
}
