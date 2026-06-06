/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const miningViewPath = path.join(projectRoot, 'src', 'views', 'game', 'MiningView.vue')

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const source = fs.readFileSync(miningViewPath, 'utf8')

const requiredPatterns = [
  [/import \{ ref, computed, onUnmounted \} from 'vue'/, 'MiningView 必须导入 onUnmounted'],
  [/const animTimers: Record<CombatVisualTarget, CombatTimer \| null>/, '必须为 player/monster 动画保存 timer id'],
  [/const floatTimers: Record<CombatVisualTarget, CombatTimer \| null>/, '必须为 player/monster 浮字保存 timer id'],
  [/let combatLockTimer: CombatTimer \| null = null/, '必须为 combat lock 保存 timer id'],
  [/const animTokens: Record<CombatVisualTarget, number>/, '动画 timer 必须有归属 token'],
  [/const floatTokens: Record<CombatVisualTarget, number>/, '浮字 timer 必须有归属 token'],
  [/let combatLockToken = 0/, 'combat lock timer 必须有归属 token'],
  [/clearAnimTimer\(target\)[\s\S]*const token = \+\+animTokens\[target\][\s\S]*animTimers\[target\] = setTimeout/, '设置新动画前必须清理旧动画 timer 并写入新 token'],
  [/clearFloatTimer\(target\)[\s\S]*const token = \+\+floatTokens\[target\][\s\S]*floatTimers\[target\] = setTimeout/, '设置新浮字前必须清理旧浮字 timer 并写入新 token'],
  [/floatTokens\[target\] !== token \|\| getFloatForTarget\(target\)\?\.key !== obj\.key/, '浮字回调必须校验 token 和浮字 key'],
  [/clearCombatLockTimer\(\)[\s\S]*const token = \+\+combatLockToken[\s\S]*combatLockTimer = setTimeout/, 'combat lock 设置前必须清理旧 timer 并写入新 token'],
  [/const clearCombatVisualTimers = \(\) => \{[\s\S]*clearAnimTimer\('player'\)[\s\S]*clearFloatTimer\('monster'\)[\s\S]*clearCombatLockTimer\(\)[\s\S]*combatAnimLock\.value = false/, '卸载清理必须覆盖动画、浮字和 combat lock'],
  [/onUnmounted\(clearCombatVisualTimers\)/, 'MiningView 卸载时必须清理 combat timer']
]

for (const [pattern, message] of requiredPatterns) {
  assert(pattern.test(source), message)
}

const createFakeTimerHarness = () => {
  let now = 0
  let nextId = 1
  const timers = new Map()
  const setFakeTimeout = (callback, delay) => {
    const id = nextId++
    timers.set(id, {
      callback,
      dueAt: now + delay,
      cleared: false
    })
    return id
  }
  const clearFakeTimeout = id => {
    const timer = timers.get(id)
    if (timer) timer.cleared = true
  }
  const advanceBy = ms => {
    const endAt = now + ms
    while (true) {
      const next = [...timers.entries()]
        .filter(([, timer]) => !timer.cleared && timer.dueAt <= endAt)
        .sort((left, right) => left[1].dueAt - right[1].dueAt)[0]
      if (!next) break
      const [id, timer] = next
      timer.cleared = true
      now = timer.dueAt
      timer.callback()
      timers.delete(id)
    }
    now = endAt
  }
  const pendingCount = () => [...timers.values()].filter(timer => !timer.cleared).length
  return { setFakeTimeout, clearFakeTimeout, advanceBy, pendingCount }
}

const createOwnedTimerModel = (setTimer, clearTimer) => {
  const targets = ['player', 'monster']
  const timers = {
    anim: Object.fromEntries(targets.map(target => [target, null])),
    float: Object.fromEntries(targets.map(target => [target, null]))
  }
  const tokens = {
    anim: Object.fromEntries(targets.map(target => [target, 0])),
    float: Object.fromEntries(targets.map(target => [target, 0]))
  }
  let lockTimer = null
  let lockToken = 0
  const clearTarget = (kind, target) => {
    tokens[kind][target] += 1
    if (timers[kind][target] !== null) clearTimer(timers[kind][target])
    timers[kind][target] = null
  }
  const scheduleTarget = (kind, target, delay, callback) => {
    clearTarget(kind, target)
    const token = ++tokens[kind][target]
    timers[kind][target] = setTimer(() => {
      if (tokens[kind][target] !== token) return
      timers[kind][target] = null
      callback()
    }, delay)
  }
  const clearLock = () => {
    lockToken += 1
    if (lockTimer !== null) clearTimer(lockTimer)
    lockTimer = null
  }
  const scheduleLock = (delay, callback) => {
    clearLock()
    const token = ++lockToken
    lockTimer = setTimer(() => {
      if (lockToken !== token) return
      lockTimer = null
      callback()
    }, delay)
  }
  const clearAll = () => {
    clearTarget('anim', 'player')
    clearTarget('anim', 'monster')
    clearTarget('float', 'player')
    clearTarget('float', 'monster')
    clearLock()
  }
  return { scheduleTarget, scheduleLock, clearAll }
}

const harness = createFakeTimerHarness()
const owner = createOwnedTimerModel(harness.setFakeTimeout, harness.clearFakeTimeout)

let monsterFloatKey = 1
let monsterFloatVisible = true
owner.scheduleTarget('float', 'monster', 800, () => {
  if (monsterFloatKey === 1) monsterFloatVisible = false
})
harness.advanceBy(400)
monsterFloatKey = 2
monsterFloatVisible = true
owner.scheduleTarget('float', 'monster', 800, () => {
  if (monsterFloatKey === 2) monsterFloatVisible = false
})
harness.advanceBy(799)
assert(monsterFloatVisible, '第二次 monster 浮字在自己的 800ms 周期前不应被第一次 timer 清理')
harness.advanceBy(1)
assert(!monsterFloatVisible, '第二次 monster 浮字应在自己的 800ms 周期结束时清理')

let lockWriteCount = 0
owner.scheduleLock(400, () => {
  lockWriteCount += 1
})
owner.clearAll()
harness.advanceBy(400)
assert(lockWriteCount === 0, '卸载清理后 combat lock timer 不应继续写状态')
assert(harness.pendingCount() === 0, '卸载清理后不应残留 pending timer')

if (errors.length > 0) {
  console.error('qa-mining-animation-timers 失败:')
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log('qa-mining-animation-timers 通过')
}
