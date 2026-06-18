export type ForgeAffixQuality = 'normal' | 'fine' | 'excellent' | 'supreme'

export type ForgeAffixId = string

export interface ForgeAffixRoll {
  id: ForgeAffixId
  value: number
  quality: ForgeAffixQuality
}
