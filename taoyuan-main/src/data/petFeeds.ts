import type { PetSpecialFeedType, PetType } from '@/types'
import { getCropUseProfile } from './cropUseProfiles'

export interface PetSpecialFeedDef {
  id: string
  itemId: string
  label: string
  shortLabel: string
  taste: PetSpecialFeedType
  preferredPetTypes: PetType[]
  friendshipGain: number
  preferredBonus: number
  rareFindChance: number
  rareFindCooldownDays: number
  rareFindPool: string[]
  description: string
  feedback: Record<PetType | 'default', string>
}

export const PET_SPECIAL_FEED_TASTE_LABELS: Record<PetSpecialFeedType, string> = {
  sweet: '清甜',
  filling: '饱腹',
  fragrant: '芳香',
  spicy: '辛香',
  herbal: '草本'
}

export const PET_SPECIAL_FEEDS: PetSpecialFeedDef[] = [
  {
    id: 'rice_pet_bowl',
    itemId: 'rice',
    label: '稻米温饱粮',
    shortLabel: '稻米',
    taste: 'filling',
    preferredPetTypes: ['dog'],
    friendshipGain: 6,
    preferredBonus: 2,
    rareFindChance: 0.02,
    rareFindCooldownDays: 4,
    rareFindPool: ['pine_cone', 'bamboo_shoot'],
    description: '基础饱腹食物，适合让宠物第二天更安稳地陪在院里。',
    feedback: {
      dog: '吃过稻米温饱粮后，田犬一早就守在门边，像是把院门巡了一遍。',
      cat: '吃过稻米温饱粮后，猫在食盆旁慢慢打理毛发，今天显得很安稳。',
      default: '宠物吃过稻米温饱粮后，第二天显得踏实了些。'
    }
  },
  {
    id: 'sweet_potato_endurance_bowl',
    itemId: 'sweet_potato',
    label: '红薯耐力餐',
    shortLabel: '红薯',
    taste: 'filling',
    preferredPetTypes: ['dog'],
    friendshipGain: 7,
    preferredBonus: 3,
    rareFindChance: 0.03,
    rareFindCooldownDays: 4,
    rareFindPool: ['bamboo_shoot', 'herb'],
    description: '厚实的饱腹食物，狗类更容易触发护院和报信反馈。',
    feedback: {
      dog: '红薯耐力餐让田犬格外有精神，它绕着院篱小跑了一圈才回来。',
      cat: '红薯耐力餐太扎实了，猫吃完后趴在窗边晒了很久太阳。',
      default: '宠物吃过红薯耐力餐后，第二天精神稳了不少。'
    }
  },
  {
    id: 'sesame_spice_bowl',
    itemId: 'sesame',
    label: '芝麻辛香餐',
    shortLabel: '芝麻',
    taste: 'spicy',
    preferredPetTypes: ['dog'],
    friendshipGain: 6,
    preferredBonus: 3,
    rareFindChance: 0.03,
    rareFindCooldownDays: 4,
    rareFindPool: ['pine_cone', 'wild_mushroom'],
    description: '辛香型轻食，狗类更容易触发巡看、报信和护院反馈。',
    feedback: {
      dog: '芝麻辛香餐让田犬鼻尖特别灵，它一早就把院门外的脚印闻了个遍。',
      cat: '猫对芝麻辛香餐有点挑剔，但还是把食盆边缘舔得干干净净。',
      default: '宠物吃过芝麻辛香餐后，第二天更爱往院门口张望。'
    }
  },
  {
    id: 'lotus_seed_calm_bowl',
    itemId: 'lotus_seed',
    label: '莲子安神餐',
    shortLabel: '莲子',
    taste: 'herbal',
    preferredPetTypes: ['cat'],
    friendshipGain: 8,
    preferredBonus: 3,
    rareFindChance: 0.04,
    rareFindCooldownDays: 5,
    rareFindPool: ['herb', 'ginseng', 'seed_lotus_seed'],
    description: '清润草本食物，偏向线索、小物和低频寻物反馈。',
    feedback: {
      dog: '莲子安神餐让田犬安静了许多，它把鼻尖埋进草丛里嗅了好一会儿。',
      cat: '猫吃过莲子安神餐后，把一片叶子压在窗边，像是替你留了个小记号。',
      default: '宠物吃过莲子安神餐后，第二天显得更敏锐了。'
    }
  },
  {
    id: 'osmanthus_fragrance_bowl',
    itemId: 'osmanthus',
    label: '桂花芳香点心',
    shortLabel: '桂花',
    taste: 'fragrant',
    preferredPetTypes: ['cat'],
    friendshipGain: 7,
    preferredBonus: 3,
    rareFindChance: 0.03,
    rareFindCooldownDays: 5,
    rareFindPool: ['seed_osmanthus', 'wild_berry', 'herb'],
    description: '芳香型点心，猫类更容易触发节会反应、来客提示和线索反馈。',
    feedback: {
      dog: '桂花芳香点心让田犬在院门前嗅了很久，像是闻到了远处集市的香气。',
      cat: '猫吃过桂花芳香点心后，蹲在窗边望向村口，像是比你更早知道有人要来。',
      default: '宠物吃过桂花芳香点心后，第二天对来客和节庆气味更敏感。'
    }
  },
  {
    id: 'pumpkin_cozy_bowl',
    itemId: 'pumpkin',
    label: '南瓜亲密餐',
    shortLabel: '南瓜',
    taste: 'sweet',
    preferredPetTypes: ['cat', 'dog'],
    friendshipGain: 7,
    preferredBonus: 2,
    rareFindChance: 0.02,
    rareFindCooldownDays: 4,
    rareFindPool: ['wild_berry', 'pine_cone'],
    description: '绵甜的家庭餐，给猫狗都提供稳定亲密反馈。',
    feedback: {
      dog: '南瓜亲密餐让田犬一路跟到屋檐下，尾巴摇得很欢。',
      cat: '南瓜亲密餐让猫难得主动蹭了蹭你的裤脚。',
      default: '宠物吃过南瓜亲密餐后，第二天更黏人了。'
    }
  },
  {
    id: 'sweet_potato_filling_feed_bowl',
    itemId: 'sweet_potato_filling_feed',
    label: '红薯饱腹粮',
    shortLabel: '红薯饱腹粮',
    taste: 'filling',
    preferredPetTypes: ['dog'],
    friendshipGain: 9,
    preferredBonus: 3,
    rareFindChance: 0.04,
    rareFindCooldownDays: 5,
    rareFindPool: ['bamboo_shoot', 'herb', 'pine_cone'],
    description: '加工后的饱腹宠物粮，狗类更容易触发护院、报信和耐力反馈。',
    feedback: {
      dog: '红薯饱腹粮让田犬一早就绕着田埂巡视，回来时还叼着一点可用的小物。',
      cat: '猫吃过红薯饱腹粮后，趴在窗边睡得很沉，醒来时精神好了不少。',
      default: '宠物吃过红薯饱腹粮后，第二天显得更耐心也更有精神。'
    }
  },
  {
    id: 'pumpkin_pet_rice_bowl',
    itemId: 'pumpkin_pet_rice',
    label: '南瓜宠物饭',
    shortLabel: '南瓜宠物饭',
    taste: 'sweet',
    preferredPetTypes: ['cat', 'dog'],
    friendshipGain: 9,
    preferredBonus: 2,
    rareFindChance: 0.03,
    rareFindCooldownDays: 5,
    rareFindPool: ['wild_berry', 'pine_cone', 'seed_pumpkin'],
    description: '加工后的绵甜宠物饭，给猫狗都提供更稳定的亲密和来客反馈。',
    feedback: {
      dog: '南瓜宠物饭让田犬一路跟到屋檐下，像是把今天的院子都认认真真看过了。',
      cat: '猫吃过南瓜宠物饭后，主动把脸贴到你手边，像是心情格外安稳。',
      default: '宠物吃过南瓜宠物饭后，第二天更愿意待在你身边。'
    }
  },
  {
    id: 'peach_mood_bowl',
    itemId: 'peach',
    label: '桃子心情餐',
    shortLabel: '桃子',
    taste: 'sweet',
    preferredPetTypes: ['cat'],
    friendshipGain: 8,
    preferredBonus: 3,
    rareFindChance: 0.03,
    rareFindCooldownDays: 5,
    rareFindPool: ['seed_peach', 'wild_berry', 'winter_bamboo_shoot'],
    description: '清甜果香食物，猫类更容易触发线索和小礼物反馈。',
    feedback: {
      dog: '桃子心情餐让田犬在院里转了两圈，像是闻到了新的来访气味。',
      cat: '猫吃过桃子心情餐后，轻轻把小爪印留在门边，像是在提醒你留意访客。',
      default: '宠物吃过桃子心情餐后，第二天心情亮了起来。'
    }
  },
  {
    id: 'radish_patrol_bowl',
    itemId: 'radish',
    label: '萝卜护院餐',
    shortLabel: '萝卜',
    taste: 'herbal',
    preferredPetTypes: ['dog'],
    friendshipGain: 6,
    preferredBonus: 2,
    rareFindChance: 0.02,
    rareFindCooldownDays: 4,
    rareFindPool: ['herb', 'wild_mushroom'],
    description: '清辛草本食物，偏向护院、巡看和普通采集反馈。',
    feedback: {
      dog: '萝卜护院餐让田犬在田埂边停了好几次，像是认真检查过作物。',
      cat: '猫吃过萝卜护院餐后，绕着仓箱走了一圈才跳上窗台。',
      default: '宠物吃过萝卜护院餐后，第二天更愿意在院里巡视。'
    }
  }
]

export interface PetSpecialFeedOption extends PetSpecialFeedDef {
  count: number
}

export const getPetSpecialFeedById = (feedId: string): PetSpecialFeedDef | undefined => PET_SPECIAL_FEEDS.find(feed => feed.id === feedId)

export const getPetSpecialFeedByItemId = (itemId: string): PetSpecialFeedDef | undefined => PET_SPECIAL_FEEDS.find(feed => feed.itemId === itemId)

export const getPetSpecialFeedTasteLabel = (taste: PetSpecialFeedType): string => PET_SPECIAL_FEED_TASTE_LABELS[taste]

export const isPetSpecialFeedPreferred = (feed: PetSpecialFeedDef, petType: PetType): boolean => feed.preferredPetTypes.includes(petType)

export const getPetSpecialFeedFeedback = (feed: PetSpecialFeedDef, petType: PetType): string => feed.feedback[petType] || feed.feedback.default

const isSpecialFeedItemEnabled = (itemId: string): boolean => {
  const cropProfile = getCropUseProfile(itemId)
  return cropProfile ? cropProfile.tags.includes('pet_feed') : true
}

export const getAvailablePetSpecialFeeds = (getCount: (itemId: string) => number): PetSpecialFeedOption[] =>
  PET_SPECIAL_FEEDS.filter(feed => getCount(feed.itemId) > 0 && isSpecialFeedItemEnabled(feed.itemId)).map(feed => ({
    ...feed,
    count: getCount(feed.itemId)
  }))
