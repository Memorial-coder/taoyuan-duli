#!/usr/bin/env node
/* global console, process, fetch */

import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')
const frontendRoot = path.resolve(repoRoot, 'taoyuan-main')
const requireFromRepo = createRequire(import.meta.url)
const requireFromFrontend = createRequire(path.join(frontendRoot, 'package.json'))

const { encryptTaoyuanData } = requireFromRepo(path.join(repoRoot, 'server', 'src', 'taoyuanSaveRuntime.js'))

const BASE_URL = normalizeBaseUrl(process.env.BASE_URL || 'https://taoyuanxiang.ymzcc.com')
const USERS_JSON_FILE = process.env.USERS_JSON_FILE ? path.resolve(process.env.USERS_JSON_FILE) : ''
const USERS_JSON = process.env.USERS_JSON || ''
const USER_LIMIT = Math.max(1, Math.floor(Number(process.env.USER_LIMIT || 100)))
const CONCURRENCY = Math.max(1, Math.floor(Number(process.env.SEED_CONCURRENCY || 6)))
const DRY_RUN = readBool(process.env.DRY_RUN, false)
const OVERWRITE = readBool(process.env.OVERWRITE, true)
const INVENTORY_STACKS = Math.max(40, Math.floor(Number(process.env.HEAVY_INVENTORY_STACKS || 140)))
const TEMP_STACKS = Math.max(0, Math.floor(Number(process.env.HEAVY_TEMP_STACKS || 36)))
const FARM_SIZE = Math.max(4, Math.min(12, Math.floor(Number(process.env.HEAVY_FARM_SIZE || 12))))
const OUT_DIR = path.resolve(repoRoot, process.env.OUT_DIR || path.join('.codex-temp', 'taoyuan-heavy-seed'))

const sampleRotation = [
  'endgame_showcase',
  'ws14_museum_hanhai_bridge',
  'late_economy_foundation',
  'ws15_relationship_event_chain',
  'fishpond_operator',
  'breeding_specialist',
]

function normalizeBaseUrl(raw) {
  const parsed = new URL(String(raw || '').trim() || 'https://taoyuanxiang.ymzcc.com')
  parsed.hash = ''
  parsed.search = ''
  return parsed.toString().replace(/\/+$/, '')
}

function readBool(raw, fallback) {
  if (raw === undefined || raw === null || raw === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase())
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

async function readUsers() {
  const raw = USERS_JSON || (USERS_JSON_FILE ? await readFile(USERS_JSON_FILE, 'utf8') : '')
  if (!raw.trim()) throw new Error('Set USERS_JSON_FILE or USERS_JSON with test accounts.')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error('Users JSON must be an array.')
  return parsed
    .map(entry => ({
      username: String(entry?.username || '').trim(),
      password: String(entry?.password || '').trim(),
    }))
    .filter(entry => entry.username && entry.password)
    .slice(0, USER_LIMIT)
}

async function buildDataBundles() {
  await mkdir(OUT_DIR, { recursive: true })
  const esbuild = requireFromFrontend('esbuild')
  const sampleBundle = path.join(OUT_DIR, 'sampleSaves.bundle.mjs')
  const itemBundle = path.join(OUT_DIR, 'items.bundle.mjs')
  const common = {
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
  }
  await esbuild.build({
    ...common,
    entryPoints: [path.join(frontendRoot, 'src', 'data', 'sampleSaves.ts')],
    outfile: sampleBundle,
  })
  await esbuild.build({
    ...common,
    entryPoints: [path.join(frontendRoot, 'src', 'data', 'items.ts')],
    outfile: itemBundle,
  })
  const sampleModule = await import(`${pathToFileURL(sampleBundle).href}?t=${Date.now()}`)
  const itemModule = await import(`${pathToFileURL(itemBundle).href}?t=${Date.now()}`)
  return {
    samples: sampleModule.BUILT_IN_SAMPLE_SAVES || [],
    items: itemModule.ITEMS || [],
  }
}

function pickSample(samples, index) {
  const byId = new Map(samples.map(sample => [sample.id, sample]))
  const sample = byId.get(sampleRotation[index % sampleRotation.length]) || samples[0]
  if (!sample?.envelope) throw new Error('No built-in sample save was available.')
  return sample
}

function createPlot(id, cropIds) {
  const cropId = cropIds[id % cropIds.length] || 'cabbage'
  const base = {
    id,
    cropId: null,
    growthDays: 0,
    watered: false,
    unwateredDays: 0,
    fertilizer: null,
    harvestCount: 0,
    giantCropGroup: null,
    seedGenetics: null,
    seedQuality: null,
    infested: false,
    infestedDays: 0,
    weedy: false,
    weedyDays: 0,
  }
  if (id < 40) {
    return {
      ...base,
      state: 'harvestable',
      cropId,
      growthDays: 99,
      watered: true,
      fertilizer: id % 3 === 0 ? 'basic_fertilizer' : null,
      seedQuality: ['normal', 'fine', 'excellent', 'supreme'][id % 4],
    }
  }
  if (id < 80) {
    return {
      ...base,
      state: 'growing',
      cropId,
      growthDays: 2 + (id % 5),
      watered: id % 2 === 0,
      fertilizer: id % 4 === 0 ? 'speed_gro' : null,
      seedQuality: ['normal', 'fine', 'excellent'][id % 3],
      infested: id % 23 === 0,
      weedy: id % 29 === 0,
    }
  }
  if (id < 108) {
    return {
      ...base,
      state: 'planted',
      cropId,
      watered: id % 2 === 0,
      seedQuality: ['normal', 'fine'][id % 2],
    }
  }
  if (id < 128) {
    return {
      ...base,
      state: 'tilled',
      fertilizer: id % 3 === 0 ? 'basic_fertilizer' : null,
    }
  }
  return {
    ...base,
    state: 'wasteland',
  }
}

function buildInventory(items) {
  const allowedCategories = new Set([
    'seed',
    'crop',
    'ore',
    'gem',
    'material',
    'processed',
    'food',
    'fish',
    'fertilizer',
    'machine',
    'animal_product',
    'fruit',
    'sapling',
    'bait',
    'tackle',
    'bomb',
    'misc',
  ])
  const defs = items
    .filter(item => item?.id && allowedCategories.has(item.category))
    .filter(item => !String(item.id).includes('debug'))
  const qualityCycle = ['normal', 'fine', 'excellent', 'supreme']
  const main = defs.slice(0, INVENTORY_STACKS).map((item, index) => ({
    itemId: item.id,
    quantity: 6 + (index % 9) * 3,
    quality: ['ore', 'gem', 'material', 'machine', 'fertilizer', 'bait', 'tackle', 'bomb', 'misc'].includes(item.category)
      ? 'normal'
      : qualityCycle[index % qualityCycle.length],
  }))
  const tempCandidates = defs
    .filter(item => ['ore', 'gem', 'fish', 'material', 'processed', 'crop'].includes(item.category))
    .slice(0, TEMP_STACKS)
  const temp = tempCandidates.map((item, index) => ({
    itemId: item.id,
    quantity: 2 + (index % 5),
    quality: ['ore', 'gem', 'material'].includes(item.category) ? 'normal' : qualityCycle[index % qualityCycle.length],
  }))
  return { main, temp }
}

function buildHeavyEnvelope(sample, items, user, userIndex) {
  const envelope = deepClone(sample.envelope)
  const data = envelope.data || envelope
  const cropIds = items.filter(item => item.category === 'crop').map(item => item.id)
  const { main, temp } = buildInventory(items)
  const now = new Date().toISOString()

  envelope.meta = {
    ...(envelope.meta || {}),
    saveVersion: Number(envelope.meta?.saveVersion) || 4,
    savedAt: now,
  }
  if (envelope.savedAt) envelope.savedAt = now

  data.game = {
    ...(data.game || {}),
    year: Math.max(3, Number(data.game?.year) || 3),
    season: data.game?.season || 'winter',
    day: Math.max(20, Number(data.game?.day) || 20),
    hour: Number(data.game?.hour) || 10,
    currentLocation: 'farm',
    currentLocationGroup: 'farm',
    farmMapType: 'standard',
  }
  data.player = {
    ...(data.player || {}),
    playerName: user.username,
    money: Math.max(188000, Number(data.player?.money) || 0),
    stamina: Math.max(220, Number(data.player?.stamina) || 0),
    maxStamina: Math.max(220, Number(data.player?.maxStamina) || 0),
    hp: Math.max(120, Number(data.player?.hp) || 0),
    baseMaxHp: Math.max(120, Number(data.player?.baseMaxHp) || 0),
  }
  data.inventory = {
    ...(data.inventory || {}),
    items: main,
    tempItems: temp,
    capacity: Math.max(180, INVENTORY_STACKS + 20),
    tools: [
      { type: 'wateringCan', tier: 'gold' },
      { type: 'hoe', tier: 'gold' },
      { type: 'pickaxe', tier: 'gold' },
      { type: 'fishingRod', tier: 'iron' },
      { type: 'scythe', tier: 'iron' },
      { type: 'axe', tier: 'iron' },
      { type: 'pan', tier: 'basic' },
    ],
  }
  data.farm = {
    ...(data.farm || {}),
    farmSize: FARM_SIZE,
    plots: Array.from({ length: FARM_SIZE * FARM_SIZE }, (_, id) => createPlot(id, cropIds)),
    greenhouseLevel: Math.max(1, Number(data.farm?.greenhouseLevel) || 0),
  }
  data.settings = {
    ...(data.settings || {}),
    lateGameFeatureOverrides: {
      ...(data.settings?.lateGameFeatureOverrides || {}),
      lateGameBudget: true,
      lateGameMaintenance: true,
      lateGameWeeklyGoals: true,
      lateGameHanhaiContracts: true,
      lateGameFishPondWeeklyContest: true,
      lateGameMuseumExhibit: true,
      lateGameVillageProsperity: true,
      lateGameSocialProgression: true,
      lateGameServiceContracts: true,
    },
  }
  data.perfSeed = {
    generatedAt: now,
    sourceSampleId: sample.id,
    userIndex,
    inventoryStacks: main.length,
    tempStacks: temp.length,
    farmSize: FARM_SIZE,
  }
  return envelope
}

function parseSetCookie(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie()
  const combined = headers.get('set-cookie')
  return combined ? [combined] : []
}

function applyCookies(cookieJar, response) {
  for (const rawCookie of parseSetCookie(response.headers)) {
    const pair = String(rawCookie).split(';', 1)[0]
    const separator = pair.indexOf('=')
    if (separator < 0) continue
    const name = pair.slice(0, separator).trim()
    const value = pair.slice(separator + 1).trim()
    if (!name) continue
    if (value) cookieJar.set(name, value)
    else cookieJar.delete(name)
  }
}

function cookieHeader(cookieJar) {
  return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join('; ')
}

async function fetchJson(pathname, options = {}, cookieJar = new Map()) {
  const headers = new Headers(options.headers || {})
  if (cookieJar.size) headers.set('Cookie', cookieHeader(cookieJar))
  const response = await fetch(`${BASE_URL}${pathname}`, {
    ...options,
    headers,
  })
  applyCookies(cookieJar, response)
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  return { response, data }
}

async function seedUser(user, index, samples, items) {
  const cookieJar = new Map()
  const login = await fetchJson('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user.username, password: user.password }),
  }, cookieJar)
  if (!login.response.ok) {
    throw new Error(`${user.username} login failed: ${login.response.status} ${login.data?.msg || ''}`)
  }
  const csrfToken = login.data?.csrf_token || ''
  if (!csrfToken) throw new Error(`${user.username} login did not return csrf_token`)

  const slots = await fetchJson('/api/taoyuan/save/slots', {}, cookieJar)
  if (!slots.response.ok) {
    throw new Error(`${user.username} slots read failed: ${slots.response.status}`)
  }
  const current = Array.isArray(slots.data?.slots) ? slots.data.slots[0] : null
  const hasRaw = typeof current?.raw === 'string' && current.raw
  const baseRevision = Number.isFinite(Number(current?.revision)) ? Math.max(0, Math.floor(Number(current.revision))) : 0
  const sample = pickSample(samples, index)
  const envelope = buildHeavyEnvelope(sample, items, user, index)
  const raw = encryptTaoyuanData(envelope)

  if (DRY_RUN) {
    return {
      username: user.username,
      status: 'dry-run',
      sampleId: sample.id,
      hadSlot0: Boolean(hasRaw),
      baseRevision,
      rawBytes: Buffer.byteLength(raw, 'utf8'),
      inventoryStacks: envelope.data.inventory.items.length,
      tempStacks: envelope.data.inventory.tempItems.length,
      farmPlots: envelope.data.farm.plots.length,
    }
  }

  if (hasRaw && !OVERWRITE) {
    return {
      username: user.username,
      status: 'skipped-existing',
      sampleId: sample.id,
      hadSlot0: true,
      baseRevision,
    }
  }

  const save = await fetchJson('/api/taoyuan/save/0', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      raw,
      base_revision: baseRevision,
      repair_field_anomalies: true,
    }),
  }, cookieJar)
  if (!save.response.ok) {
    throw new Error(`${user.username} save failed: ${save.response.status} ${save.data?.code || ''} ${save.data?.msg || ''}`)
  }

  const activeSlot = await fetchJson('/api/taoyuan/save/active-slot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ slot: 0 }),
  }, cookieJar)
  if (!activeSlot.response.ok) {
    throw new Error(`${user.username} active slot failed: ${activeSlot.response.status} ${activeSlot.data?.msg || ''}`)
  }

  return {
    username: user.username,
    status: 'seeded',
    sampleId: sample.id,
    hadSlot0: Boolean(hasRaw),
    baseRevision,
    nextRevision: Number(save.data?.current_revision ?? save.data?.revision ?? 0),
    rawBytes: Buffer.byteLength(raw, 'utf8'),
    inventoryStacks: envelope.data.inventory.items.length,
    tempStacks: envelope.data.inventory.tempItems.length,
    farmPlots: envelope.data.farm.plots.length,
  }
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      try {
        results[index] = await mapper(items[index], index)
      } catch (error) {
        results[index] = {
          username: items[index]?.username || `index-${index}`,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }
  })
  await Promise.all(workers)
  return results
}

async function main() {
  const users = await readUsers()
  const { samples, items } = await buildDataBundles()
  if (!samples.length) throw new Error('No built-in sample saves found.')
  if (!items.length) throw new Error('No item definitions found.')

  const results = await mapLimit(users, CONCURRENCY, (user, index) => seedUser(user, index, samples, items))
  await mkdir(OUT_DIR, { recursive: true })
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    dryRun: DRY_RUN,
    overwrite: OVERWRITE,
    userCount: users.length,
    concurrency: CONCURRENCY,
    inventoryStacks: INVENTORY_STACKS,
    tempStacks: TEMP_STACKS,
    farmSize: FARM_SIZE,
    summary: {
      seeded: results.filter(item => item.status === 'seeded').length,
      dryRun: results.filter(item => item.status === 'dry-run').length,
      skippedExisting: results.filter(item => item.status === 'skipped-existing').length,
      failed: results.filter(item => item.status === 'failed').length,
    },
    results,
  }
  const outFile = path.join(OUT_DIR, `seed-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  await writeFile(outFile, JSON.stringify(report, null, 2), 'utf8')
  console.log(`seed report: ${outFile}`)
  console.log(JSON.stringify(report.summary))
  const failures = results.filter(item => item.status === 'failed')
  if (failures.length) {
    for (const failure of failures.slice(0, 10)) console.error(`${failure.username}: ${failure.error}`)
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
