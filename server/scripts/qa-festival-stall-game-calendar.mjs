import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { __testing } = require('../src/taoyuanFestivalStall')

const makeSave = day => ({
  game: {
    year: 1,
    season: 'autumn',
    day,
  },
})

const sunday = __testing.getFestivalAvailability(makeSave(14))
assert.equal(sunday.open, true, 'game day 14 should be Sunday and open')
assert.equal(sunday.weekWindow.week_key, 'game:1:autumn:week-2', 'game week key should follow save calendar')
assert.equal(sunday.weekWindow.game_calendar.weekday_label, '周日', 'game day 14 should be labeled Sunday')
assert.match(sunday.weekWindow.refresh_hint, /按游戏内周轮换/, 'refresh hint should mention game-week rotation')

const monday = __testing.getFestivalAvailability(makeSave(8))
assert.equal(monday.open, false, 'game day 8 should be Monday and closed')
assert.equal(monday.weekWindow.game_calendar.weekday_label, '周一', 'game day 8 should be labeled Monday')
assert.match(monday.reason, /游戏内每周五到周日/, 'closed reason should mention the game calendar')

const friday = __testing.getFestivalAvailability(makeSave(12))
assert.equal(friday.open, true, 'game day 12 should be Friday and open')
assert.equal(friday.weekWindow.game_calendar.weekday_label, '周五', 'game day 12 should be labeled Friday')

const missingSave = __testing.getFestivalAvailability(null)
assert.equal(missingSave.open, false, 'missing save cannot determine game-calendar availability')
assert.equal(missingSave.weekWindow.week_key, 'game-calendar-unavailable', 'missing save should not use a real-world week key')

console.log('festival stall game-calendar QA passed')
