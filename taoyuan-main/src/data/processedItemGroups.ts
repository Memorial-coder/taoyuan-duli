import type { LinkageSystemId, ProcessedItemGroupDef, ProcessedItemGroupId } from '@/types'

export const PROCESSED_ITEM_GROUP_REQUIRED_MACHINE_TYPES = [
  'wine_workshop',
  'sauce_jar',
  'sugar_jar',
  'bee_house',
  'oil_press',
  'mayo_maker',
  'smoker',
  'dehydrator',
  'drying_rack',
  'cheese_press',
  'loom',
  'furnace',
  'charcoal_kiln',
  'mill',
  'tea_maker',
  'tofu_press',
  'herb_grinder',
  'alchemy_furnace',
  'incense_maker',
  'spirit_forge'
] as const

export const PROCESSED_ITEM_GROUPS: ProcessedItemGroupDef[] = [
  {
    id: 'oil',
    label: '油料',
    summary: '榨油、料理底油、节庆备菜和周期订单的通用油料池。',
    itemIds: [
      'sesame_oil',
      'rapeseed_oil',
      'tea_oil',
      'mixed_seed_oil',
      'refined_seed_oil',
      'artisan_seed_oil',
      'spirit_seed_oil',
      'celestial_seed_oil',
      'truffle_oil'
    ],
    demandSystems: ['cooking', 'quest', 'familyWish', 'festival'],
    demandTags: ['oil', 'processed_sink', 'festival_prep', 'home_cooking'],
    orderCandidateItemIds: ['mixed_seed_oil', 'sesame_oil', 'rapeseed_oil', 'tea_oil'],
    familyWishCandidateItemIds: ['mixed_seed_oil', 'sesame_oil'],
    festivalCandidateItemIds: ['mixed_seed_oil', 'rapeseed_oil', 'truffle_oil']
  },
  {
    id: 'flour',
    label: '粉料',
    summary: '米粉、面粉和隐藏研磨粉，承接料理、宠物点心、家庭备餐和节庆糕点。',
    itemIds: [
      'rice_flour',
      'wheat_flour',
      'cornmeal',
      'sesame_powder',
      'mixed_flour',
      'fine_flour',
      'premium_flour',
      'spirit_flour',
      'celestial_flour'
    ],
    demandSystems: ['cooking', 'quest', 'familyWish', 'festival', 'petFeed'],
    demandTags: ['flour', 'processed_sink', 'festival_prep', 'pet_feed'],
    orderCandidateItemIds: ['rice_flour', 'wheat_flour', 'cornmeal', 'mixed_flour'],
    familyWishCandidateItemIds: ['rice_flour', 'wheat_flour', 'mixed_flour'],
    festivalCandidateItemIds: ['rice_flour', 'fine_flour', 'premium_flour']
  },
  {
    id: 'pickled',
    label: '腌制',
    summary: '酱缸和发酵类咸酸备料，适合周订单、节前凉菜和家庭换季备餐。',
    itemIds: [
      'rice_vinegar',
      'pickled_cabbage',
      'dried_radish',
      'pickled_radish',
      'pickled_chili',
      'pickled_ginger',
      'mixed_pickles',
      'root_pickles',
      'fine_pickles',
      'spirit_pickles',
      'celestial_pickles',
      'pumpkin_preserve'
    ],
    demandSystems: ['quest', 'familyWish', 'festival'],
    demandTags: ['pickle', 'processed_sink', 'festival_prep', 'pantry'],
    orderCandidateItemIds: ['pickled_cabbage', 'pickled_radish', 'pickled_chili', 'mixed_pickles'],
    familyWishCandidateItemIds: ['pickled_cabbage', 'dried_radish', 'rice_vinegar'],
    festivalCandidateItemIds: ['pickled_ginger', 'root_pickles', 'fine_pickles']
  },
  {
    id: 'dried',
    label: '干货',
    summary: '晒架、脱水机和酱缸产出的冬储干货，适合周目标、远行口粮和节庆备货。',
    itemIds: [
      'dried_mushroom',
      'dried_peach',
      'dried_lychee',
      'dried_persimmon_slice',
      'dried_hawthorn',
      'dried_apricot',
      'dried_berry',
      'dried_vegetable',
      'dried_crop_bundle',
      'fine_dried_crop_bundle',
      'spirit_dried_crop_bundle',
      'celestial_dried_crop_bundle',
      'dried_fruit_mix',
      'fine_dried_fruit_mix',
      'spirit_dried_fruit_mix',
      'celestial_dried_fruit_mix',
      'dried_herb',
      'dried_lotus_seed',
      'dried_radish'
    ],
    demandSystems: ['quest', 'familyWish', 'festival', 'regionMap'],
    demandTags: ['dried', 'processed_sink', 'winter_store', 'travel_ration'],
    orderCandidateItemIds: ['dried_mushroom', 'dried_vegetable', 'dried_crop_bundle', 'dried_fruit_mix'],
    familyWishCandidateItemIds: ['dried_peach', 'dried_vegetable', 'dried_lotus_seed'],
    festivalCandidateItemIds: ['dried_persimmon_slice', 'dried_crop_bundle', 'fine_dried_crop_bundle']
  },
  {
    id: 'sweet',
    label: '甜品材料',
    summary: '蜂蜜、蜜脯和糖渍类材料，给家庭点心、宠物反馈、节会茶席和礼物线提供消耗池。',
    itemIds: [
      'honey',
      'chrysanthemum_honey',
      'osmanthus_honey',
      'rapeseed_honey',
      'snow_lotus_honey',
      'wildflower_honey',
      'fine_wildflower_honey',
      'spirit_wildflower_honey',
      'celestial_wildflower_honey',
      'candied_peach',
      'dried_fruit_mix',
      'candied_fruit_mix',
      'fine_candied_fruit',
      'spirit_candied_fruit',
      'mystic_candied_fruit',
      'celestial_candied_fruit',
      'pumpkin_preserve'
    ],
    demandSystems: ['cooking', 'quest', 'familyWish', 'festival', 'petFeed'],
    demandTags: ['sweet', 'honey', 'processed_sink', 'festival_prep'],
    orderCandidateItemIds: ['honey', 'candied_peach', 'candied_fruit_mix', 'wildflower_honey'],
    familyWishCandidateItemIds: ['honey', 'candied_peach', 'dried_fruit_mix'],
    festivalCandidateItemIds: ['osmanthus_honey', 'candied_fruit_mix', 'fine_candied_fruit']
  },
  {
    id: 'animal_processed',
    label: '动物加工',
    summary: '蛋黄酱和奶酪等牧场深加工品，承接料理、订单和节前席面。',
    itemIds: [
      'mayonnaise',
      'duck_mayonnaise',
      'goose_mayonnaise',
      'silkie_mayonnaise',
      'ostrich_mayonnaise',
      'quail_mayonnaise',
      'cheese',
      'goat_cheese',
      'buffalo_cheese',
      'yak_cheese'
    ],
    demandSystems: ['cooking', 'quest', 'familyWish', 'festival'],
    demandTags: ['animal_processed', 'dairy', 'mayo', 'processed_sink'],
    orderCandidateItemIds: ['mayonnaise', 'duck_mayonnaise', 'cheese', 'goat_cheese'],
    familyWishCandidateItemIds: ['mayonnaise', 'cheese'],
    festivalCandidateItemIds: ['mayonnaise', 'goose_mayonnaise', 'buffalo_cheese']
  },
  {
    id: 'fish_processed',
    label: '鱼加工',
    summary: '烟熏鱼和鱼饲料，连接钓鱼、鱼塘、订单和远行补给。',
    itemIds: [
      'fish_feed',
      'smoked_crucian',
      'smoked_carp',
      'smoked_grass_carp',
      'smoked_bass',
      'smoked_catfish',
      'smoked_mandarin_fish',
      'smoked_eel',
      'smoked_sturgeon',
      'smoked_loach',
      'smoked_yellow_eel',
      'smoked_fish',
      'smoked_prime_fish',
      'smoked_legendary_fish'
    ],
    demandSystems: ['quest', 'familyWish', 'festival', 'fishPond', 'regionMap'],
    demandTags: ['fish_processed', 'smoked', 'pond_feed', 'processed_sink'],
    orderCandidateItemIds: ['smoked_crucian', 'smoked_carp', 'smoked_fish', 'fish_feed'],
    familyWishCandidateItemIds: ['fish_feed', 'smoked_fish'],
    festivalCandidateItemIds: ['smoked_bass', 'smoked_prime_fish']
  },
  {
    id: 'medicine_processed',
    label: '药材加工',
    summary: '药膏、药粉、丹炉中间品和短效丹药，承接采石场、远征、家庭照料和稀有订单。',
    itemIds: [
      'herbal_paste',
      'ginseng_extract',
      'antler_powder',
      'lotus_heart_powder',
      'animal_medicine',
      'medicinal_powder',
      'fine_medicinal_powder',
      'spirit_medicinal_powder',
      'celestial_medicinal_powder',
      'partial_elixir_slurry',
      'failed_elixir_ash',
      'rare_elixir_crystal',
      'qingxin_lotus_elixir',
      'warming_sweet_potato_pill',
      'grain_breath_elixir',
      'sesame_courtesy_elixir',
      'pumpkin_warmth_elixir',
      'yam_foundation_elixir',
      'garlic_coldward_elixir',
      'bitter_gourd_cooling_elixir',
      'spicy_vitality_pill',
      'osmanthus_focus_elixir',
      'tea_focus_elixir',
      'stone_root_guard_pill',
      'spirit_peach_elixir',
      'ley_crystal_focus_elixir',
      'wind_core_guard_pill',
      'marsh_luminous_cleansing_elixir',
      'moon_pearl_calm_elixir',
      'jade_orchid_focus_elixir',
      'rare_lotus_guard_elixir',
      'jade_peach_spirit_elixir',
      'moon_elixir'
    ],
    demandSystems: ['quest', 'familyWish', 'quarry', 'regionMap', 'inventoryUse', 'festival'],
    demandTags: ['medicine', 'elixir', 'processed_sink', 'expedition_supply'],
    orderCandidateItemIds: ['herbal_paste', 'ginseng_extract', 'animal_medicine', 'medicinal_powder'],
    familyWishCandidateItemIds: ['herbal_paste', 'animal_medicine', 'warming_sweet_potato_pill'],
    festivalCandidateItemIds: ['qingxin_lotus_elixir', 'osmanthus_focus_elixir', 'jade_peach_spirit_elixir']
  },
  {
    id: 'fermented',
    label: '酒醋发酵',
    summary: '酒坊和酒馆类饮品，承接节会席面、订单评分和礼物线。',
    itemIds: [
      'watermelon_wine',
      'osmanthus_wine',
      'tavern_rice_wine',
      'rice_vinegar',
      'peach_wine',
      'jujube_wine',
      'corn_wine',
      'mixed_fruit_wine',
      'seasonal_fruit_wine',
      'spirit_fruit_brew',
      'mystic_fruit_wine',
      'celestial_fruit_wine',
      'ancient_fruit_wine',
      'tavern_plum_wine',
      'tavern_herbal_brew',
      'tavern_premium_brew'
    ],
    demandSystems: ['quest', 'familyWish', 'festival', 'shop'],
    demandTags: ['fermented', 'wine', 'festival_prep', 'processed_sink'],
    orderCandidateItemIds: ['tavern_rice_wine', 'peach_wine', 'jujube_wine', 'mixed_fruit_wine'],
    familyWishCandidateItemIds: ['tavern_rice_wine', 'rice_vinegar'],
    festivalCandidateItemIds: ['tavern_rice_wine', 'osmanthus_wine', 'seasonal_fruit_wine']
  },
  {
    id: 'tea',
    label: '茶饮',
    summary: '制茶机和隐藏调饮产物，连接待客、节会茶席、订单和家庭心愿。',
    itemIds: [
      'green_tea_drink',
      'guest_green_tea',
      'chrysanthemum_tea',
      'processed_osmanthus_tea',
      'ginseng_tea',
      'herbal_tea_blend',
      'fine_herbal_tea_blend',
      'spirit_herbal_tea_blend',
      'celestial_herbal_tea_blend'
    ],
    demandSystems: ['quest', 'familyWish', 'festival'],
    demandTags: ['tea', 'drink', 'hospitality', 'processed_sink'],
    orderCandidateItemIds: ['green_tea_drink', 'processed_osmanthus_tea', 'herbal_tea_blend'],
    familyWishCandidateItemIds: ['green_tea_drink', 'guest_green_tea'],
    festivalCandidateItemIds: ['processed_osmanthus_tea', 'chrysanthemum_tea', 'fine_herbal_tea_blend']
  },
  {
    id: 'tofu',
    label: '豆制',
    summary: '豆腐坊和芝麻酱产物，适合料理、家庭餐、节前斋菜和宠物点心扩展。',
    itemIds: [
      'tofu',
      'peanut_tofu',
      'sesame_paste',
      'mixed_tofu',
      'firm_mixed_tofu',
      'spirit_tofu',
      'celestial_tofu'
    ],
    demandSystems: ['cooking', 'quest', 'familyWish', 'festival', 'petFeed'],
    demandTags: ['tofu', 'plant_protein', 'processed_sink', 'festival_prep'],
    orderCandidateItemIds: ['tofu', 'peanut_tofu', 'sesame_paste', 'mixed_tofu'],
    familyWishCandidateItemIds: ['tofu', 'sesame_paste'],
    festivalCandidateItemIds: ['mixed_tofu', 'firm_mixed_tofu']
  },
  {
    id: 'feed',
    label: '饲料点心',
    summary: '磨坊和药碾产出的饲料、宠物点心与鱼饵，连接动物、宠物、鱼塘和家庭训练。',
    itemIds: [
      'standard_bait',
      'fish_feed',
      'premium_feed',
      'nourishing_feed',
      'vitality_feed',
      'sweet_potato_filling_feed',
      'pumpkin_pet_rice',
      'sesame_patrol_biscuit',
      'lotus_heart_cat_treat',
      'spirit_fruit_mooncake'
    ],
    demandSystems: ['animal', 'petFeed', 'fishPond', 'familyWish', 'quest'],
    demandTags: ['feed', 'pet_feed', 'animal_feed', 'processed_sink'],
    orderCandidateItemIds: ['fish_feed', 'premium_feed', 'nourishing_feed'],
    familyWishCandidateItemIds: ['pumpkin_pet_rice', 'sesame_patrol_biscuit', 'fish_feed'],
    festivalCandidateItemIds: ['spirit_fruit_mooncake', 'lotus_heart_cat_treat']
  },
  {
    id: 'textile',
    label: '布料',
    summary: '织机产物，用于装饰、家庭修缮、订单、服饰和节庆布置。',
    itemIds: [
      'cloth',
      'silk_cloth',
      'alpaca_cloth',
      'felt'
    ],
    demandSystems: ['quest', 'familyWish', 'decoration', 'festival'],
    demandTags: ['textile', 'decoration', 'household_repair', 'processed_sink'],
    orderCandidateItemIds: ['cloth', 'silk_cloth', 'felt'],
    familyWishCandidateItemIds: ['cloth', 'felt'],
    festivalCandidateItemIds: ['silk_cloth', 'alpaca_cloth']
  },
  {
    id: 'incense',
    label: '香品',
    summary: '制香坊产物，作为礼物、节会供品、家庭静心和稀有订单的材料池。',
    itemIds: [
      'pine_incense',
      'camphor_incense',
      'osmanthus_incense',
      'rustic_incense',
      'refined_incense',
      'spirit_incense',
      'celestial_incense'
    ],
    demandSystems: ['quest', 'familyWish', 'festival', 'npcFunction'],
    demandTags: ['incense', 'gift', 'festival_prep', 'processed_sink'],
    orderCandidateItemIds: ['pine_incense', 'camphor_incense', 'rustic_incense'],
    familyWishCandidateItemIds: ['pine_incense', 'rustic_incense'],
    festivalCandidateItemIds: ['osmanthus_incense', 'refined_incense', 'spirit_incense']
  },
  {
    id: 'refined_material',
    label: '精炼材料',
    summary: '熔炉、炭窑、药碾和炼丹转化出的中后期基础材料，适合村建、装备和订单。',
    itemIds: [
      'copper_bar',
      'iron_bar',
      'gold_bar',
      'iridium_bar',
      'bronze_bar',
      'refined_quartz',
      'mythril_bar',
      'charcoal',
      'paper',
      'prismatic_shard'
    ],
    demandSystems: ['quest', 'villageProject', 'equipment', 'familyWish'],
    demandTags: ['refined_material', 'crafting', 'village_project', 'processed_sink'],
    orderCandidateItemIds: ['copper_bar', 'iron_bar', 'bronze_bar', 'paper'],
    familyWishCandidateItemIds: ['paper', 'charcoal'],
    festivalCandidateItemIds: ['paper', 'bronze_bar']
  },
  {
    id: 'spirit_craft',
    label: '灵锻',
    summary: '灵锻台产出的功能性器物和稀有赠礼，主要进入装备、装饰、目标和后续长线委托。',
    itemIds: [
      'dragon_scale_charm',
      'blossom_crown',
      'jade_mortar',
      'fox_flame_lantern',
      'cultivation_jade',
      'silver_thread_ring',
      'spirit_dragon_pearl',
      'eternal_blossom',
      'moon_elixir',
      'fox_spirit_bead',
      'immortal_gourd',
      'starlight_loom'
    ],
    demandSystems: ['quest', 'equipment', 'decoration', 'trinket'],
    demandTags: ['spirit_craft', 'late_game', 'equipment', 'processed_sink'],
    orderCandidateItemIds: ['jade_mortar', 'cultivation_jade', 'spirit_dragon_pearl'],
    familyWishCandidateItemIds: ['fox_flame_lantern', 'eternal_blossom'],
    festivalCandidateItemIds: ['blossom_crown', 'moon_elixir']
  }
]

export const PROCESSED_ITEM_GROUP_LABELS: Record<ProcessedItemGroupId, string> = Object.fromEntries(
  PROCESSED_ITEM_GROUPS.map(group => [group.id, group.label])
) as Record<ProcessedItemGroupId, string>

export const getProcessedItemGroupDef = (groupId: ProcessedItemGroupId): ProcessedItemGroupDef | undefined =>
  PROCESSED_ITEM_GROUPS.find(group => group.id === groupId)

export const getProcessedItemGroupIdsForItem = (itemId: string): ProcessedItemGroupId[] =>
  PROCESSED_ITEM_GROUPS
    .filter(group => group.itemIds.includes(itemId))
    .map(group => group.id)

export const getProcessedItemGroupLabelsForItem = (itemId: string): string[] =>
  getProcessedItemGroupIdsForItem(itemId)
    .map(groupId => PROCESSED_ITEM_GROUP_LABELS[groupId])
    .filter((label): label is string => !!label)

export const getProcessedItemIdsByGroup = (groupId: ProcessedItemGroupId): string[] =>
  getProcessedItemGroupDef(groupId)?.itemIds ?? []

export const isProcessedItemInGroup = (itemId: string, groupId: ProcessedItemGroupId): boolean =>
  getProcessedItemIdsByGroup(groupId).includes(itemId)

const getCandidateIdsForSystem = (group: ProcessedItemGroupDef, system: LinkageSystemId): string[] => {
  if (system === 'quest') return group.orderCandidateItemIds ?? group.itemIds
  if (system === 'familyWish') return group.familyWishCandidateItemIds ?? group.itemIds
  if (system === 'festival') return group.festivalCandidateItemIds ?? group.orderCandidateItemIds ?? group.itemIds
  return group.itemIds
}

export const getProcessedItemDemandCandidates = (
  system: LinkageSystemId,
  groupId?: ProcessedItemGroupId
): { groupId: ProcessedItemGroupId; groupLabel: string; itemId: string }[] =>
  PROCESSED_ITEM_GROUPS
    .filter(group => (!groupId || group.id === groupId) && group.demandSystems.includes(system))
    .flatMap(group => getCandidateIdsForSystem(group, system).map(itemId => ({
      groupId: group.id,
      groupLabel: group.label,
      itemId
    })))
