import { HYBRID_DEFS } from './breeding'
import { MUSEUM_EXHIBIT_SETS } from './museum'
import { POND_BREEDS } from './pondBreeds'
import { QUARRY_MUSEUM_ARTIFACT_ITEM_IDS } from './quarry'

export type SpeciesNoteSourceSystem = 'breeding' | 'fishPond' | 'regionMap' | 'quarry' | 'museum'
export type SpeciesNoteRewardKind = 'order_bias' | 'museum_exhibit' | 'potential_hint' | 'ticket_hint'

export interface SpeciesNoteProgressInput {
  breedingHybridIds?: string[]
  pondBreedIds?: string[]
  completedRegionIds?: string[]
  discoveredQuarryArtifactItemIds?: string[]
  completedMuseumExhibitSetIds?: string[]
}

export interface SpeciesNoteProgressEntry {
  id: string
  title: string
  sourceSystems: SpeciesNoteSourceSystem[]
  progress: number
  target: number
  completed: boolean
  progressLabel: string
  effectSummary: string
  rewardKinds: SpeciesNoteRewardKind[]
}

export interface SpeciesNoteOverview {
  entries: SpeciesNoteProgressEntry[]
  completedCount: number
  totalCount: number
  progressPercent: number
  orderBiasScore: number
  museumExhibitSetIds: string[]
  nextEntry: SpeciesNoteProgressEntry | null
}

export const SPECIES_NOTE_DEFS = [
  {
    id: 'breeding_lineage_notes',
    title: '育种谱系札记',
    summary: '记录已发现的作物杂交品系，把育种图鉴转成订单和展示主题线索。',
    sourceSystems: ['breeding'] as SpeciesNoteSourceSystem[],
    target: Math.min(8, HYBRID_DEFS.length),
    rewardKinds: ['order_bias', 'potential_hint'] as SpeciesNoteRewardKind[],
    effectSummary: '完成后提高育种/作物主题订单提示权重，并作为后续潜能材料线索。'
  },
  {
    id: 'fishpond_breed_notes',
    title: '鱼塘品系札记',
    summary: '记录鱼塘已发现品系和高代样鱼，把鱼塘图鉴转成展示池、周赛和订单线索。',
    sourceSystems: ['fishPond'] as SpeciesNoteSourceSystem[],
    target: 12,
    rewardKinds: ['order_bias', 'museum_exhibit'] as SpeciesNoteRewardKind[],
    effectSummary: '完成后提高鱼塘相关订单提示权重，并指向鱼塘物种展。'
  },
  {
    id: 'region_ecology_notes',
    title: '区域生态札记',
    summary: '记录行旅图已完成区域路线，把区域发现转成博物馆、鱼塘和后续需求池线索。',
    sourceSystems: ['regionMap'] as SpeciesNoteSourceSystem[],
    target: 2,
    rewardKinds: ['museum_exhibit', 'ticket_hint'] as SpeciesNoteRewardKind[],
    effectSummary: '完成后提示区域样本可进入博物馆展组和活动票券路线。'
  },
  {
    id: 'quarry_relic_notes',
    title: '采石遗物札记',
    summary: '记录采石场遗物池的发现，把副本遗物从一次性捐赠延伸到展组与学者委托。',
    sourceSystems: ['quarry', 'museum'] as SpeciesNoteSourceSystem[],
    target: Math.min(3, QUARRY_MUSEUM_ARTIFACT_ITEM_IDS.length),
    rewardKinds: ['museum_exhibit', 'potential_hint'] as SpeciesNoteRewardKind[],
    effectSummary: '完成后提示深脉采石展和遗物研究委托优先推进。'
  },
  {
    id: 'museum_showcase_notes',
    title: '专题展示札记',
    summary: '记录已完成的博物馆专题展组，把展示成果反向沉淀为跨系统收集目标。',
    sourceSystems: ['museum'] as SpeciesNoteSourceSystem[],
    target: Math.min(2, MUSEUM_EXHIBIT_SETS.length),
    rewardKinds: ['order_bias', 'museum_exhibit'] as SpeciesNoteRewardKind[],
    effectSummary: '完成后提示博物馆展组可继续影响展示评分、访客热度和订单风向。'
  }
] as const

const clampProgress = (value: number, target: number) => Math.min(Math.max(0, Math.floor(Number(value) || 0)), Math.max(1, target))

export const buildSpeciesNoteOverview = (input: SpeciesNoteProgressInput = {}): SpeciesNoteOverview => {
  const counters: Record<(typeof SPECIES_NOTE_DEFS)[number]['id'], number> = {
    breeding_lineage_notes: new Set(input.breedingHybridIds ?? []).size,
    fishpond_breed_notes: new Set(input.pondBreedIds ?? []).size,
    region_ecology_notes: new Set(input.completedRegionIds ?? []).size,
    quarry_relic_notes: new Set(input.discoveredQuarryArtifactItemIds ?? []).size,
    museum_showcase_notes: new Set(input.completedMuseumExhibitSetIds ?? []).size
  }

  const entries: SpeciesNoteProgressEntry[] = SPECIES_NOTE_DEFS.map(def => {
    const progress = clampProgress(counters[def.id], def.target)
    const completed = progress >= def.target
    return {
      id: def.id,
      title: def.title,
      sourceSystems: [...def.sourceSystems],
      progress,
      target: def.target,
      completed,
      progressLabel: `${progress}/${def.target}`,
      effectSummary: def.effectSummary,
      rewardKinds: [...def.rewardKinds]
    }
  })
  const completedCount = entries.filter(entry => entry.completed).length
  const totalCount = entries.length
  return {
    entries,
    completedCount,
    totalCount,
    progressPercent: totalCount > 0 ? Math.floor((completedCount / totalCount) * 100) : 0,
    orderBiasScore: entries.filter(entry => entry.completed && entry.rewardKinds.includes('order_bias')).length,
    museumExhibitSetIds: MUSEUM_EXHIBIT_SETS.map(set => set.id),
    nextEntry: entries.find(entry => !entry.completed) ?? null
  }
}

export const SPECIES_NOTE_TOTAL_POND_BREED_COUNT = POND_BREEDS.length
export const SPECIES_NOTE_TOTAL_BREEDING_HYBRID_COUNT = HYBRID_DEFS.length
