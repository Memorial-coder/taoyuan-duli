import { rm } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const serverRoot = path.resolve(__dirname, '..')
const tmpDir = path.resolve(serverRoot, '.tmp-online-invite-alias')
process.env.DB_STORAGE = path.join(tmpDir, '.storage.json')
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''

await rm(tmpDir, { recursive: true, force: true })

const db = require('../src/db')
const { encryptTaoyuanData, saveUserSaveSlots } = require('../src/taoyuanSaveRuntime')
const socialRuntime = require('../src/taoyuanSocialRuntime')
const manorRuntime = require('../src/taoyuanManorRuntime')
const activityRoomRuntime = require('../src/taoyuanActivityRoomRuntime')
const societyRuntime = require('../src/taoyuanSocietyRuntime')
const cohabitationRuntime = require('../src/taoyuanCohabitationRuntime')

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const writeSave = (username, playerName, money = 5000) => {
  saveUserSaveSlots(username, {
    slots: {
      0: {
        raw: encryptTaoyuanData({
          player: {
            name: playerName,
            playerName,
            money,
          },
          farm: {
            plots: [
              {
                id: 1,
                cropId: 'rice',
                state: 'harvestable',
                watered: false,
              },
            ],
            fruitTrees: [
              {
                id: 'peach_tree_alias',
                type: 'peach',
                fruitId: 'peach',
                mature: true,
                todayFruit: true,
              },
            ],
          },
          animal: {
            animals: [
              {
                id: 'cow_alias',
                type: 'cow',
                wasFed: false,
                wasPetted: false,
              },
            ],
            pets: [],
          },
          fishPond: {
            pond: {
              fish: [{ id: 'fish_alias', itemId: 'carp' }],
              waterQuality: 60,
            },
          },
          decoration: {
            placed: {
              bench_alias: 1,
            },
          },
          inventory: {
            items: [],
            tempItems: [],
            ownedWeapons: [],
            ownedRings: [],
            ownedHats: [],
            ownedShoes: [],
            capacity: 24,
          },
        }),
        revision: 1,
      },
      1: null,
      2: null,
    },
  })
}

const register = async (username, displayName, playerName) => {
  const result = await db.registerUser(username, 'SmokePass_alias', displayName)
  assert(result.ok, `register ${username} failed: ${result.msg || 'unknown error'}`)
  writeSave(username, playerName)
  return {
    username,
    displayName,
    playerName,
    actor: { username, displayName },
  }
}

const host = await register('alias_host', 'AliasHost', 'AliasHostSave')
const guest = await register('alias_guest', '云影', '云影角色')
const societyGuest = await register('alias_soc_guest', '云影村社', '云影村社角色')
const cohabGuest = await register('alias_cohab_guest', '云影合住', '云影合住角色')

const makeFriends = async (owner, target) => {
  const request = await socialRuntime.requestFriendship(owner.username, { target_username: target.username })
  assert(request?.id, `friend request missing for ${target.username}`)
  const accepted = await socialRuntime.acceptFriendRequest(target.username, request.id)
  assert(accepted?.request?.status === 'accepted' || accepted?.status === 'accepted', `friend request not accepted for ${target.username}`)
}

await makeFriends(host, guest)
await makeFriends(host, societyGuest)
await makeFriends(host, cohabGuest)

await manorRuntime.updateManorAccessPolicy(guest.username, {
  visit_mode: 'friends',
  care_mode: 'friends',
  steal_mode: 'friends',
})

const festivalRoom = await activityRoomRuntime.createFestivalRoom({
  template_id: 'lantern_fair',
  gameplay_template_id: 'squad_coop',
  title: 'alias invite festival',
}, host.actor)
const invitedRoom = await activityRoomRuntime.inviteFestivalRoomMember(festivalRoom.room.id, {
  target_username: guest.displayName,
}, host.actor)
const festivalInvite = invitedRoom.room.invitations.find(item => item.target_username === guest.username)
assert(festivalInvite, 'festival invite did not resolve friend display name to account username')
assert(Number(festivalInvite.target_save_id) > 0, 'festival invite did not persist resolved save id')

const society = await societyRuntime.createSociety({
  name: 'AliasInviteSociety',
  summary: 'alias invite regression',
  notice: 'alias invite regression',
}, host.actor)
assert(society?.society?.id || society?.overview?.my_society?.id, 'society create did not return a society')
const societyInvite = await societyRuntime.inviteToSociety({
  target_username: societyGuest.displayName,
}, host.actor)
assert(societyInvite?.request?.username === societyGuest.username, 'society invite did not resolve friend display name to account username')
assert(Number(societyInvite.request.target_save_id) > 0, 'society invite did not persist resolved save id')

const cohabitation = await cohabitationRuntime.createCohabitationContract({
  type: 'bosom_partner',
  title: 'alias invite cohabitation',
  target_username: cohabGuest.displayName,
  idempotency_key: 'qa-online-invite-alias-cohabitation',
}, host.actor)
assert(cohabitation?.contract?.members?.some(member => member.username === cohabGuest.username), 'cohabitation contract did not resolve friend display name to account username')

const visitEntry = await manorRuntime.recordManorVisit({
  target_username: guest.displayName,
  purpose: 'friend_visit',
  summary: 'alias manor visit',
  feedback: 'alias manor feedback',
}, host.actor)
assert(visitEntry.target_username === guest.username, 'manor visit did not resolve friend display name to account username')
assert(Number(visitEntry.target_save_id) > 0, 'manor visit did not persist resolved save id')

const guestbookEntry = await manorRuntime.leaveGuestbookEntry({
  target_username: guest.displayName,
  kind: 'blessing',
  content: 'alias manor guestbook',
}, host.actor)
assert(guestbookEntry.target_username === guest.username, 'manor guestbook did not resolve friend display name to account username')
assert(Number(guestbookEntry.target_save_id) > 0, 'manor guestbook did not persist resolved save id')

const careResult = await manorRuntime.submitManorCareAction({
  target_username: guest.displayName,
  object_id: 'manor_animal_shed',
  action_id: 'feed_animals',
  idempotency_key: 'qa-online-invite-alias-manor-care',
}, host.actor)
assert(careResult?.entry?.target_username === guest.username, 'manor care did not resolve friend display name to account username')

const stealResult = await manorRuntime.submitManorStealAction({
  target_username: guest.displayName,
  object_id: 'manor_field',
  action_id: 'steal_plot_sample',
  idempotency_key: 'qa-online-invite-alias-manor-steal',
}, host.actor)
assert(stealResult?.entry?.target_username === guest.username, 'manor steal did not resolve friend display name to account username')

const careRoomResult = await manorRuntime.createManorCareRoom({
  target_username: guest.displayName,
  member_limit: 2,
  idempotency_key: 'qa-online-invite-alias-manor-care-room',
}, host.actor)
assert(careRoomResult?.room?.target_username === guest.username, 'manor care room did not resolve friend display name to account username')

console.log('qa-online-invite-alias passed')
