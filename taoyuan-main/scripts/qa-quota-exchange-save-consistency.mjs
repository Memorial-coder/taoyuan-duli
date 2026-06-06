/* global console */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(projectRoot, '..')

const readProjectFile = relativePath => readFile(path.join(projectRoot, relativePath), 'utf8')
const readRepoFile = relativePath => readFile(path.join(repoRoot, relativePath), 'utf8')

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const countMatches = (source, pattern) => {
  const matches = source.match(pattern)
  return matches ? matches.length : 0
}

const extractBetween = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker)
  assert(start >= 0, `缺少片段起点: ${startMarker}`)
  const end = source.indexOf(endMarker, start)
  assert(end > start, `缺少片段终点: ${endMarker}`)
  return source.slice(start, end)
}

const [
  walletView,
  quotaExchangeApi,
  saveStore,
  routesApi,
  hallRuntime,
] = await Promise.all([
  readProjectFile(path.join('src', 'views', 'game', 'WalletView.vue')),
  readProjectFile(path.join('src', 'utils', 'quotaExchangeApi.ts')),
  readProjectFile(path.join('src', 'stores', 'useSaveStore.ts')),
  readRepoFile(path.join('server', 'src', 'routes', 'api.js')),
  readRepoFile(path.join('server', 'src', 'taoyuanHall.js')),
])

const persistExchangeResult = extractBetween(
  walletView,
  'const persistExchangeResult = async',
  'const handleImport = async'
)

assert(
  persistExchangeResult.includes('saveStore.acknowledgeServerSlotRevision(runtimeServerSlot.value, result.saveRevision)'),
  '额度兑换成功后必须先确认服务端槽位 revision，避免后续 pending/autoSave 用旧 base 覆盖服务端结果'
)
assert(
  !persistExchangeResult.includes('playerStore.setMoney'),
  '服务端已落盘后 persistExchangeResult 不得再回滚本地铜钱'
)
assert(
  !persistExchangeResult.includes('rollbackMoney'),
  '额度兑换保存失败路径不得保留旧 rollbackMoney 入参'
)
assert(
  persistExchangeResult.includes('额度已写入服务端，但当前会话不可自动保存') &&
    persistExchangeResult.includes('额度已写入服务端，但当前会话自动保存失败'),
  'pending copy 和 autoSave 失败都必须提示服务端已落盘并要求重新读取'
)
assert(
  !walletView.includes('已回滚本地铜钱') &&
    !walletView.includes('已回滚当前会话的铜钱') &&
    !walletView.includes('已回滚当前会话'),
  'WalletView 不应再提示服务端成功后回滚本地铜钱'
)
assert(
  countMatches(walletView, /playerStore\.setMoney\(result\.taoyuanMoney \?\?/g) >= 2,
  '导入和导出后都必须优先使用服务端返回的 taoyuanMoney 更新本地铜钱'
)
assert(
  countMatches(walletView, /activeSaveSlot: runtimeServerSlot\.value/g) >= 2,
  '导入和导出请求都必须携带当前服务端槽位'
)

assert(
  quotaExchangeApi.includes('active_save_slot: activeSaveSlot') &&
    countMatches(quotaExchangeApi, /idempotency_key: idempotencyKey/g) >= 2,
  '额度导入/导出请求必须携带 active_save_slot 和 idempotency_key'
)
assert(
  countMatches(quotaExchangeApi, /taoyuanMoney: typeof data\.taoyuan_money/g) >= 2 &&
    countMatches(quotaExchangeApi, /saveRevision: Number\.isFinite\(Number\(data\.save_revision\)\)/g) >= 2,
  '额度导入/导出响应必须解析服务端铜钱和 save revision'
)

assert(
  saveStore.includes('const acknowledgeServerSlotRevision =') &&
    saveStore.includes('rememberServerSlotState(normalizedSlot, null, revision)'),
  'useSaveStore 必须提供 acknowledgeServerSlotRevision 并写入服务端 revision 状态'
)
assert(
  saveStore.includes('const baseRevision = map[slot]?.baseRevision ?? Math.max(0, Math.floor(Number(lastIssuedServerRevisionBySlot.value[slot]) || 0))'),
  '后续 pending server save 必须使用已确认的服务端 revision 作为 CAS base'
)

assert(
  hallRuntime.includes('const revision = persistGameplayData(context)') &&
    hallRuntime.includes('revision,'),
  'taoyuanHall.updateActiveSaveMoney 必须返回 persistGameplayData 产生的服务端 revision'
)
assert(
  countMatches(routesApi, /taoyuan_money: saveUpdate\.money/g) >= 2 &&
    countMatches(routesApi, /save_revision: saveUpdate\.revision/g) >= 2,
  '额度导入/导出服务端响应都必须返回服务端铜钱和 revision'
)
assert(
  countMatches(routesApi, /TAOYUAN_EXCHANGE_SAVE_SLOT_STALE/g) >= 2,
  '额度导入/导出必须在活动槽位变化时返回 stale，避免写错服务端槽位'
)

console.log('[qa-quota-exchange-save-consistency] OK')
