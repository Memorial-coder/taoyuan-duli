/* global console */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const shopViewPath = path.join(projectRoot, 'src/views/game/ShopView.vue')
const source = fs.readFileSync(shopViewPath, 'utf8')

const assertContains = (needle, message) => {
  if (!source.includes(needle)) {
    throw new Error(message)
  }
}

assertContains('data-testid="biaoju-escort-services"', '镖局页必须展示押镖/行旅承接区。')
assertContains('BIAOJU_ESCORT_SERVICES', '镖局承接服务必须集中定义。')
assertContains("id: 'caravan_waybill'", '镖局承接必须包含商路票押镖路签服务。')
assertContains("ticketRewards: { caravan: 1 }", '押镖路签服务必须发放 1 张商路票。')
assertContains("id: 'forward_supply_pack'", '镖局承接必须包含护送前压补给。')
assertContains("itemId: 'adventurer_ration'", '护送前压补给必须发放冒险口粮。')
assertContains("itemId: 'combat_tonic'", '护送前压补给必须发放战斗补剂。')
assertContains("id: 'road_receipt_sorting'", '镖局承接必须包含驿路回执整理。')
assertContains("itemId: 'ancient_waybill'", '驿路回执整理必须发放驿路关券。')
assertContains('BIAOJU_ESCORT_DAILY_LIMIT_COPY', '镖局承接必须保留每日限办提示。')
assertContains('biaoju_escort_service:${serviceId}:${currentDayTag.value}', '镖局承接每日限办必须按服务和日期入账。')
assertContains("playerStore.hasLifestyleDiscovery('lifestyleUnlocks'", '镖局承接必须读取存档内每日限办记录。')
assertContains('playerStore.markLifestyleUnlock(biaojuEscortServiceLedgerId(service.id), currentDayTag.value)', '镖局承接成功后必须写入每日限办记录。')
assertContains("data-testid=\"biaoju-escort-route-quest\"", '镖局承接必须提供任务板跳转锚点。')
assertContains("data-testid=\"biaoju-escort-route-region-map\"", '镖局承接必须提供行旅图跳转锚点。')
assertContains("data-testid=\"biaoju-escort-route-hanhai\"", '镖局承接必须提供瀚海跳转锚点。')

console.log('qa-biaoju-escort-services passed')
