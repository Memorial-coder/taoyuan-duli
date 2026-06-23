/* global console */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const files = {
  npcTypes: 'src/types/npc.ts',
  npcs: 'src/data/npcs.ts',
  npcStore: 'src/stores/useNpcStore.ts',
  animalStore: 'src/stores/useAnimalStore.ts',
  processingStore: 'src/stores/useProcessingStore.ts',
  cottageView: 'src/views/game/CottageView.vue',
  npcView: 'src/views/game/NpcView.vue'
}

const sources = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]))

const failures = []
const assert = (condition, message) => {
  if (!condition) failures.push(message)
}
const includes = (source, snippet) => source.includes(snippet)

for (const roleId of ['field_support', 'home_care', 'craft_assist', 'social_coordination']) {
  assert(includes(sources.npcs, `id: '${roleId}'`), `missing role definition: ${roleId}`)
  assert(includes(sources.npcStore, `${roleId}: {`), `missing household role effect config: ${roleId}`)
}

for (const effectKey of [
  'familyWishProgress',
  'familyWishItemRelief',
  'animalMoodFloor',
  'processingSpeedPercent',
  'familyFavorTicket',
  'childTrainingFriendshipBonus'
]) {
  assert(includes(sources.npcTypes, effectKey), `missing HouseholdRoleEffectKey: ${effectKey}`)
  assert(includes(sources.npcStore, effectKey), `missing household role effect store usage: ${effectKey}`)
}

assert(includes(sources.npcTypes, 'HouseholdRoleEffectSummary'), 'missing HouseholdRoleEffectSummary type')
assert(includes(sources.npcStore, 'HOUSEHOLD_ROLE_EFFECTS'), 'missing household role effect registry')
assert(includes(sources.npcStore, 'getHouseholdRoleEffectValue'), 'missing effect value getter')
assert(includes(sources.npcStore, 'getHouseholdRoleEffectSummaries'), 'missing effect summary getter')
assert(includes(sources.npcStore, 'getHouseholdRoleAssignmentSummary'), 'missing per-assignment summary getter')

assert(includes(sources.npcStore, 'applyFamilyWishHouseholdRelief'), 'family wish item relief is not centralized')
assert(includes(sources.npcStore, 'getEffectiveFamilyWishItemRequirements'), 'family wish effective requirement helper missing')
assert(includes(sources.npcStore, 'originalQuantity'), 'family wish UI/status does not expose original quantity')
assert(includes(sources.npcStore, 'relievedQuantity'), 'family wish UI/status does not expose relieved quantity')
assert(includes(sources.npcStore, 'consumeFamilyWishItemRequirements') && includes(sources.npcStore, 'getEffectiveFamilyWishItemRequirements(wishDef)'), 'family wish consumption does not use effective requirements')

assert(includes(sources.npcStore, 'applyHouseholdRoleWeeklyEffect'), 'weekly household role settlement helper missing')
assert(includes(sources.npcStore, 'logs.push(...applyHouseholdRoleWeeklyEffect(entry))'), 'cycle tick does not apply household role weekly effects')
assert(includes(sources.npcStore, "walletStore.addRewardTickets({ familyFavor: ticketAmount }"), 'social coordination does not grant familyFavor ticket')
assert(includes(sources.npcStore, "updateFamilyWishProgress(delta)"), 'home care does not add family wish weekly progress')

assert(includes(sources.animalStore, "getHouseholdRoleEffectValue('animalMoodFloor')"), 'animal store does not consume household mood floor')
assert(includes(sources.animalStore, 'Math.max(animal.mood, Math.min(255, householdMoodFloor))'), 'animal mood floor is not applied as a floor')
assert(includes(sources.processingStore, "getHouseholdRoleEffectValue('processingSpeedPercent')"), 'processing store does not consume household processing speed')
assert(includes(sources.processingStore, 'multiplier *= (1 - householdProcessingSpeedBonus)'), 'processing speed effect is not part of multiplier')

assert(includes(sources.npcStore, "getHouseholdRoleEffectValue('childTrainingFriendshipBonus')"), 'child training does not consume household training bonus')
assert(includes(sources.npcStore, 'friendshipGain = 2 + householdTrainingBonus'), 'child training bonus is not added to base gain')

assert(includes(sources.cottageView, 'data-testid="cottage-household-role-effects"'), 'Cottage UI missing household role effects panel')
assert(includes(sources.cottageView, 'data-testid="cottage-household-role-effect-row"'), 'Cottage UI missing household role effect rows')
assert(includes(sources.cottageView, 'row.originalQuantity'), 'Cottage UI does not show original family wish quantity')
assert(includes(sources.cottageView, 'row.relievedQuantity'), 'Cottage UI does not show family wish relief')
assert(includes(sources.npcView, 'data-testid="npc-household-role-effects"'), 'Npc UI missing household role effects panel')
assert(includes(sources.npcView, 'data-testid="npc-household-role-effect-row"'), 'Npc UI missing household role effect rows')

const craftEffectMatch = sources.npcStore.match(/craft_assist:\s*{[\s\S]*?value:\s*(\d+)/)
assert(craftEffectMatch && Number(craftEffectMatch[1]) <= 5, 'craft assist speed should stay below high-tier NPC speed')
const moodFloorMatch = sources.npcStore.match(/field_support:\s*{[\s\S]*?value:\s*(\d+)/)
assert(moodFloorMatch && Number(moodFloorMatch[1]) <= 20, 'field support mood floor should stay modest')
assert(includes(sources.npcStore, '最低保留 1 个'), 'family wish relief should keep at least one required item')

if (failures.length > 0) {
  console.error('[qa-household-role-effects] failed')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[qa-household-role-effects] passed')
