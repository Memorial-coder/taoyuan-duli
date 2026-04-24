import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'

import ts from 'typescript'
import { BUILT_IN_SAMPLE_SAVES } from '../src/data/sampleSaves.ts'

const errors = []
const infos = []
const runtimeSummaries = []

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')
const SRC_ROOT = path.join(PROJECT_ROOT, 'src')

const loadValidItemIds = () => {
  const itemsFilePath = path.resolve(__dirname, '../src/data/items.ts')
  const source = fs.readFileSync(itemsFilePath, 'utf8')
  const itemIds = new Set(Array.from(source.matchAll(/id:\s*'([^']+)'/g), match => match[1]))

  const cropsSource = fs.readFileSync(path.resolve(__dirname, '../src/data/crops.ts'), 'utf8')
  for (const match of cropsSource.matchAll(/id:\s*'([^']+)'/g)) {
    itemIds.add(match[1])
  }
  for (const match of cropsSource.matchAll(/seedId:\s*'([^']+)'/g)) {
    itemIds.add(match[1])
  }

  const fishSource = fs.readFileSync(path.resolve(__dirname, '../src/data/fish.ts'), 'utf8')
  for (const match of fishSource.matchAll(/id:\s*'([^']+)'/g)) {
    itemIds.add(match[1])
  }

  const recipesSource = fs.readFileSync(path.resolve(__dirname, '../src/data/recipes.ts'), 'utf8')
  for (const match of recipesSource.matchAll(/id:\s*'([^']+)'/g)) {
    itemIds.add(`food_${match[1]}`)
  }

  const processingSource = fs.readFileSync(path.resolve(__dirname, '../src/data/processing.ts'), 'utf8')
  for (const match of processingSource.matchAll(/id:\s*'([^']+)'/g)) {
    itemIds.add(match[1])
    itemIds.add(`machine_${match[1]}`)
  }

  return itemIds
}

const validItemIds = loadValidItemIds()

const assertCheck = (condition, message) => {
  if (!condition) {
    errors.push(message)
  }
}

const isValidFishGenetics = genetics => {
  if (!genetics || typeof genetics !== 'object') return false
  return ['weight', 'growthRate', 'diseaseRes', 'qualityGene', 'mutationRate'].every(key => Number.isFinite(genetics[key]))
}

const countTruthyEntries = value =>
  value && typeof value === 'object'
    ? Object.values(value).filter(entry => entry && typeof entry === 'object' && entry.completed === true).length
    : 0

const countPositiveTicketTypes = ledger =>
  ledger && typeof ledger === 'object'
    ? Object.values(ledger).filter(amount => Number.isFinite(Number(amount)) && Number(amount) > 0).length
    : 0

const hookState = {
  registered: false,
  modulesPromise: null,
}

const tryResolveFile = candidate => {
  const variants = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.js`,
    path.join(candidate, 'index.ts'),
    path.join(candidate, 'index.js'),
  ]
  for (const item of variants) {
    try {
      if (fs.statSync(item).isFile()) return item
    } catch {}
  }
  return null
}

const installTypeScriptHooks = () => {
  if (hookState.registered) return
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === 'file-saver') return { url: 'qa:file-saver', shortCircuit: true }
      if (specifier === 'qmsg') return { url: 'qa:qmsg', shortCircuit: true }
      if (specifier === '@/router') return { url: 'qa:router', shortCircuit: true }
      if (specifier === '@/utils/mailboxApi') return { url: 'qa:mailbox-api', shortCircuit: true }
      if (specifier === '@/composables/useAudio' || specifier === './useAudio') return { url: 'qa:audio', shortCircuit: true }

      if (specifier.startsWith('@/')) {
        const resolved = tryResolveFile(path.join(SRC_ROOT, specifier.slice(2)))
        if (!resolved) throw new Error(`无法解析模块：${specifier}`)
        return { url: pathToFileURL(resolved).href, shortCircuit: true }
      }

      if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
        const parentPath = fileURLToPath(context.parentURL)
        const resolved = tryResolveFile(path.resolve(path.dirname(parentPath), specifier))
        if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true }
      }

      return nextResolve(specifier, context)
    },
    load(url, context, nextLoad) {
      if (url === 'qa:file-saver') {
        return {
          format: 'module',
          source: 'export const saveAs = () => {}',
          shortCircuit: true,
        }
      }
      if (url === 'qa:qmsg') {
        return {
          format: 'module',
          source: 'const noop = () => {}; const Qmsg = { config: noop, info: noop, success: noop, warning: noop, error: noop, closeAll: noop }; export default Qmsg;',
          shortCircuit: true,
        }
      }
      if (url === 'qa:router') {
        return {
          format: 'module',
          source: `
            const currentRoute = { value: { name: 'menu', path: '/' } }
            const normalizeRoute = (to) => {
              if (typeof to === 'string') {
                if (to.startsWith('/game/')) return { name: to.slice('/game/'.length), path: to }
                return { name: to.replace(/^\\//, '') || 'menu', path: to }
              }
              return {
                name: to?.name || (typeof to?.path === 'string' ? to.path.replace(/^\\//, '') : 'menu'),
                path: to?.path || (to?.name ? String(to.name) : '/')
              }
            }
            const router = {
              currentRoute,
              push(to) { currentRoute.value = normalizeRoute(to); return Promise.resolve(currentRoute.value) },
              replace(to) { currentRoute.value = normalizeRoute(to); return Promise.resolve(currentRoute.value) }
            }
            export default router
          `,
          shortCircuit: true,
        }
      }
      if (url === 'qa:mailbox-api') {
        return {
          format: 'module',
          source: 'export const createSystemMailboxCampaign = async () => ({ ok: true, campaign: null })',
          shortCircuit: true,
        }
      }
      if (url === 'qa:audio') {
        return {
          format: 'module',
          source: `
            const noop = () => {}
            const asyncNoop = async () => {}
            const makeRef = value => ({ value })
            const sfxEnabled = makeRef(false)
            const bgmEnabled = makeRef(false)
            export const useAudio = () => ({
              sfxEnabled,
              bgmEnabled,
              toggleSfx: noop,
              toggleBgm: noop,
              startBgm: asyncNoop,
              stopBgm: noop,
              switchToSeasonalBgm: asyncNoop,
              startFestivalBgm: asyncNoop,
              endFestivalBgm: noop,
              startMinigameBgm: asyncNoop,
              endMinigameBgm: noop,
              startHanhaiBgm: asyncNoop,
              endHanhaiBgm: noop
            })
            export const sfxClick = noop
            export const sfxWater = noop
            export const sfxPlant = noop
            export const sfxHarvest = noop
            export const sfxDig = noop
            export const sfxBuy = noop
            export const sfxCoin = noop
            export const sfxLevelUp = noop
            export const sfxAttack = noop
            export const sfxHurt = noop
            export const sfxEncounter = noop
            export const sfxDefend = noop
            export const sfxFlee = noop
            export const sfxVictory = noop
            export const sfxFishCatch = noop
            export const sfxLineBroken = noop
            export const sfxMine = noop
            export const sfxSleep = noop
            export const sfxForage = noop
            export const sfxGameStart = noop
            export const sfxRewardClaim = noop
            export const sfxCountdownTick = noop
            export const sfxCountdownFinal = noop
            export const sfxMiniPerfect = noop
            export const sfxMiniGood = noop
            export const sfxMiniPoor = noop
            export const sfxMiniFail = noop
            export const sfxRankFirst = noop
            export const sfxRankSecond = noop
            export const sfxRankThird = noop
            export const sfxRankLose = noop
            export const sfxCastLine = noop
            export const sfxFishBite = noop
            export const sfxPaddle = noop
            export const sfxRiddleReveal = noop
            export const sfxRiddleWrong = noop
            export const sfxTeaPour = noop
            export const sfxTeaBell = noop
            export const sfxItemSelect = noop
            export const sfxJudging = noop
            export const sfxArrowFly = noop
            export const sfxPotClang = noop
            export const sfxWindGust = noop
            export const sfxKitePull = noop
            export const sfxDoughStep = noop
            export const sfxDumplingDone = noop
            export const sfxFireworkLaunch = noop
            export const sfxFireworkBoom = noop
            export const sfxRouletteTick = noop
            export const sfxRouletteSpin = noop
            export const sfxRouletteStop = noop
            export const sfxDiceTick = noop
            export const sfxDiceRoll = noop
            export const sfxDiceLand = noop
            export const sfxCupTick = noop
            export const sfxCupShuffle = noop
            export const sfxCupReveal = noop
            export const sfxCricketTick = noop
            export const sfxCricketChirp = noop
            export const sfxCricketClash = noop
            export const sfxCardFlip = noop
            export const sfxChipBet = noop
            export const sfxFoldCards = noop
            export const sfxGunshot = noop
            export const sfxGunEmpty = noop
            export const sfxCasinoWin = noop
            export const sfxCasinoLose = noop
          `,
          shortCircuit: true,
        }
      }

      if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
        const filePath = fileURLToPath(url)
        const source = fs
          .readFileSync(filePath, 'utf8')
          .replace(/import\.meta\.env/g, 'globalThis.__QA_IMPORT_META_ENV__')
        const transpiled = ts.transpileModule(source, {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.Preserve,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
          fileName: filePath,
        })
        return {
          format: 'module',
          source: transpiled.outputText,
          shortCircuit: true,
        }
      }

      return nextLoad(url, context)
    },
  })
  hookState.registered = true
}

const installBrowserShims = () => {
  globalThis.__QA_IMPORT_META_ENV__ = { DEV: true, PROD: false }

  const stubStorage = new Map()
  const localStorage = {
    getItem(key) {
      return stubStorage.has(key) ? stubStorage.get(key) : null
    },
    setItem(key, value) {
      stubStorage.set(key, String(value))
    },
    removeItem(key) {
      stubStorage.delete(key)
    },
  }

  const makeElement = (tag = 'div') => ({
    tagName: tag.toUpperCase(),
    style: {
      setProperty() {},
      removeProperty() {},
    },
    classList: {
      add() {},
      remove() {},
      contains() {
        return false
      },
    },
    appendChild() {},
    removeChild() {},
    setAttribute() {},
    removeAttribute() {},
    insertBefore() {},
    cloneNode() {
      return makeElement(tag)
    },
    firstChild: null,
    childNodes: [],
    innerHTML: '',
    content: { firstChild: null },
  })

  const document = {
    hidden: false,
    visibilityState: 'visible',
    documentElement: {
      style: {
        fontSize: '',
        setProperty() {},
        removeProperty() {},
      },
    },
    body: makeElement('body'),
    createElement(tag) {
      return makeElement(tag)
    },
    createElementNS(_ns, tag) {
      return makeElement(tag)
    },
    createTextNode(text) {
      return { nodeValue: String(text) }
    },
    createComment(text) {
      return { nodeValue: String(text) }
    },
    querySelector() {
      return null
    },
    addEventListener() {},
    removeEventListener() {},
  }

  const locationObj = {
    hash: '#/',
    host: 'localhost:4013',
    pathname: '/',
    search: '',
    origin: 'http://localhost:4013',
    assign() {},
    replace() {},
  }

  const response = {
    ok: true,
    status: 200,
    headers: { get: () => '' },
    json: async () => ({ ok: true }),
    text: async () => '',
  }

  const windowObj = {
    localStorage,
    location: locationObj,
    history: {
      state: null,
      replaceState() {},
      pushState() {},
    },
    setTimeout,
    clearTimeout,
    addEventListener() {},
    removeEventListener() {},
    document,
    matchMedia() {
      return {
        matches: false,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      }
    },
  }

  Object.defineProperty(globalThis, 'window', { value: windowObj, configurable: true })
  Object.defineProperty(globalThis, 'self', { value: windowObj, configurable: true })
  Object.defineProperty(globalThis, 'location', { value: locationObj, configurable: true })
  Object.defineProperty(globalThis, 'history', { value: windowObj.history, configurable: true })
  Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true })
  Object.defineProperty(globalThis, 'document', { value: document, configurable: true })
  Object.defineProperty(globalThis, 'navigator', { value: { sendBeacon: () => true }, configurable: true })
  Object.defineProperty(globalThis, 'Element', { value: function Element() {}, configurable: true })
  Object.defineProperty(globalThis, 'HTMLElement', { value: function HTMLElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'SVGElement', { value: function SVGElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'fetch', { value: async () => response, configurable: true })
}

const loadRuntimeModules = async () => {
  if (!hookState.modulesPromise) {
    hookState.modulesPromise = (async () => {
      installTypeScriptHooks()
      installBrowserShims()

      const { createPinia, setActivePinia } = await import('pinia')
      setActivePinia(createPinia())

      const saveStoreModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/stores/useSaveStore.ts')).href)
      const gameStoreModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/stores/useGameStore.ts')).href)
      const playerStoreModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/stores/usePlayerStore.ts')).href)
      const goalStoreModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/stores/useGoalStore.ts')).href)
      const breedingStoreModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/stores/useBreedingStore.ts')).href)
      const fishPondStoreModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/stores/useFishPondStore.ts')).href)
      const villageProjectStoreModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/stores/useVillageProjectStore.ts')).href)
      const museumStoreModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/stores/useMuseumStore.ts')).href)
      const hanhaiStoreModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/stores/useHanhaiStore.ts')).href)
      const walletStoreModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/stores/useWalletStore.ts')).href)
      const weekCycleModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/utils/weekCycle.ts')).href)
      const endDayModule = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src/composables/useEndDay.ts')).href)
      const routerModule = await import('@/router')

      return {
        saveStore: saveStoreModule.useSaveStore(),
        gameStore: gameStoreModule.useGameStore(),
        playerStore: playerStoreModule.usePlayerStore(),
        goalStore: goalStoreModule.useGoalStore(),
        breedingStore: breedingStoreModule.useBreedingStore(),
        fishPondStore: fishPondStoreModule.useFishPondStore(),
        villageProjectStore: villageProjectStoreModule.useVillageProjectStore(),
        museumStore: museumStoreModule.useMuseumStore(),
        hanhaiStore: hanhaiStoreModule.useHanhaiStore(),
        walletStore: walletStoreModule.useWalletStore(),
        getWeekCycleInfo: weekCycleModule.getWeekCycleInfo,
        handleEndDay: endDayModule.handleEndDay,
        router: routerModule.default,
      }
    })()
  }
  return hookState.modulesPromise
}

const assertRuntime = (condition, message) => {
  if (!condition) {
    errors.push(message)
  }
}

const runRuntimeSmoke = async sample => {
  const {
    saveStore,
    gameStore,
    playerStore,
    goalStore,
    breedingStore,
    fishPondStore,
    villageProjectStore,
    museumStore,
    hanhaiStore,
    walletStore,
    getWeekCycleInfo,
    handleEndDay,
    router,
  } = await loadRuntimeModules()

  const loaded = await saveStore.loadBuiltInSampleSave(sample.id)
  assertRuntime(loaded, `${sample.id} 运行态导入失败。`)
  if (!loaded) return

  await router.push({ name: sample.recommendedRouteName })

  const expectation = sample.runtimeExpectations
  assertRuntime(gameStore.isGameStarted === true, `${sample.id} 导入后 gameStore.isGameStarted 不是 true。`)
  assertRuntime(gameStore.currentLocation === expectation.game.currentLocation, `${sample.id} 当前地点不是 ${expectation.game.currentLocation}。`)
  assertRuntime(gameStore.currentLocationGroup === expectation.game.currentLocationGroup, `${sample.id} 当前地点组不是 ${expectation.game.currentLocationGroup}。`)
  assertRuntime(playerStore.money >= expectation.player.minMoney, `${sample.id} 玩家金钱低于预期下限 ${expectation.player.minMoney}。`)

  if (expectation.player.requireEconomyTelemetry) {
    assertRuntime(Array.isArray(playerStore.economyTelemetry?.recentSnapshots), `${sample.id} economyTelemetry.recentSnapshots 不可读。`)
    assertRuntime(playerStore.economyTelemetry.recentSnapshots.length > 0, `${sample.id} economyTelemetry.recentSnapshots 为空。`)
  }

  if (expectation.goal) {
    if (expectation.goal.minDailyGoals) {
      assertRuntime(goalStore.dailyGoals.length >= expectation.goal.minDailyGoals, `${sample.id} 日目标数量不足。`)
    }
    if (expectation.goal.minSeasonGoals) {
      assertRuntime(goalStore.seasonGoals.length >= expectation.goal.minSeasonGoals, `${sample.id} 季目标数量不足。`)
    }
    if (expectation.goal.minWeeklyGoals) {
      assertRuntime(goalStore.weeklyGoals.length >= expectation.goal.minWeeklyGoals, `${sample.id} 周目标数量不足。`)
    }
    if (expectation.goal.minLongTermGoals) {
      assertRuntime(goalStore.longTermGoals.length >= expectation.goal.minLongTermGoals, `${sample.id} 长期目标数量不足。`)
    }
    if (expectation.goal.minWeeklySnapshots) {
      assertRuntime(goalStore.weeklyMetricArchive.snapshots.length >= expectation.goal.minWeeklySnapshots, `${sample.id} 周快照数量不足。`)
    }
    if (expectation.goal.requireThemeWeek) {
      assertRuntime(!!goalStore.currentThemeWeek, `${sample.id} 当前主题周不可读。`)
    }
  }

  if (expectation.breeding) {
    if (expectation.breeding.unlocked !== undefined) {
      assertRuntime(breedingStore.unlocked === expectation.breeding.unlocked, `${sample.id} 育种解锁状态不符合预期。`)
    }
    if (expectation.breeding.minBreedingBox) {
      assertRuntime(breedingStore.breedingBox.length >= expectation.breeding.minBreedingBox, `${sample.id} 育种箱样本数不足。`)
    }
    if (expectation.breeding.minCompendiumEntries) {
      assertRuntime(breedingStore.compendium.length >= expectation.breeding.minCompendiumEntries, `${sample.id} 育种图鉴条目不足。`)
    }
    if (expectation.breeding.minRegisteredSeeds) {
      assertRuntime(breedingStore.breedingContestState.registeredSeedIds.length >= expectation.breeding.minRegisteredSeeds, `${sample.id} 育种周赛报名样本不足。`)
    }
  }

  if (expectation.fishPond) {
    if (expectation.fishPond.built !== undefined) {
      assertRuntime(fishPondStore.pond.built === expectation.fishPond.built, `${sample.id} 鱼塘建造状态不符合预期。`)
    }
    if (expectation.fishPond.minFish) {
      assertRuntime(fishPondStore.pond.fish.length >= expectation.fishPond.minFish, `${sample.id} 鱼塘存鱼数量不足。`)
    }
    if (expectation.fishPond.minPendingProducts) {
      assertRuntime(fishPondStore.pendingProducts.length >= expectation.fishPond.minPendingProducts, `${sample.id} 待领取产物数量不足。`)
    }
    if (expectation.fishPond.minRegisteredFish) {
      assertRuntime(fishPondStore.pondContestState.registeredFishIds.length >= expectation.fishPond.minRegisteredFish, `${sample.id} 鱼塘周赛报名样本不足。`)
    }
  }

  if (expectation.villageProject?.minCompletedProjects) {
    assertRuntime(
      countTruthyEntries(villageProjectStore.projectStates) >= expectation.villageProject.minCompletedProjects,
      `${sample.id} 村庄建设已完成项目数量不足。`,
    )
  }

  if (expectation.museum?.minDonatedItems) {
    assertRuntime(museumStore.donatedItems.length >= expectation.museum.minDonatedItems, `${sample.id} 博物馆捐赠条目不足。`)
  }

  if (expectation.hanhai) {
    if (expectation.hanhai.unlocked !== undefined) {
      assertRuntime(hanhaiStore.unlocked === expectation.hanhai.unlocked, `${sample.id} 瀚海解锁状态不符合预期。`)
    }
    if (expectation.hanhai.minRelicRecords) {
      assertRuntime(Object.keys(hanhaiStore.relicRecords ?? {}).length >= expectation.hanhai.minRelicRecords, `${sample.id} 瀚海遗迹记录数量不足。`)
    }
  }

  if (expectation.wallet?.minTicketTypes) {
    assertRuntime(countPositiveTicketTypes(walletStore.rewardTickets) >= expectation.wallet.minTicketTypes, `${sample.id} 钱包票券类型数不足。`)
  }

  if (expectation.weeklyPlan) {
    if (expectation.weeklyPlan.requirePrimaryRoute) {
      assertRuntime(!!goalStore.weeklyPlanSnapshot?.primaryRouteLabel, `${sample.id} weeklyPlanSnapshot 缺少主路线。`)
    }
    if (expectation.weeklyPlan.minClaimableNodes) {
      assertRuntime(
        (goalStore.weeklyPlanSnapshot?.claimableNodeLabels?.length ?? 0) >= expectation.weeklyPlan.minClaimableNodes,
        `${sample.id} weeklyPlanSnapshot 可领奖点数量不足。`,
      )
    }
    if (expectation.weeklyPlan.requireNextWeekPrep) {
      assertRuntime(!!goalStore.weeklyPlanSnapshot?.nextWeekPrepSummary, `${sample.id} weeklyPlanSnapshot 缺少下周准备说明。`)
    }
    if (expectation.weeklyPlan.minActiveBridgeIds) {
      assertRuntime(
        (goalStore.weeklyPlanSnapshot?.activeBridgeIds?.length ?? 0) >= expectation.weeklyPlan.minActiveBridgeIds,
        `${sample.id} active progress bridge 数量不足。`,
      )
    }
  }

  if (expectation.chronicle?.minEntries) {
    assertRuntime((goalStore.weeklyChronicleEntries?.length ?? 0) >= expectation.chronicle.minEntries, `${sample.id} 周纪行条目数量不足。`)
  }

  const beforeWeekId = getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId
  const beforeThemeWeekId = goalStore.currentThemeWeek?.id ?? ''
  const beforeChronicleCount = goalStore.weeklyChronicleEntries?.length ?? 0

  switch (expectation.boundaryAction ?? 'none') {
    case 'week_rollover':
      handleEndDay()
      assertRuntime(getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId !== beforeWeekId, `${sample.id} 日结后没有进入下一周。`)
      assertRuntime(goalStore.lastWeeklyGoalSettlement?.weekId === beforeWeekId, `${sample.id} 缺少上一周的周结算摘要。`)
      assertRuntime((goalStore.currentThemeWeek?.id ?? '') !== beforeThemeWeekId, `${sample.id} 主题周没有切换。`)
      if (expectation.chronicle?.minEntriesAfterBoundary) {
        assertRuntime(
          (goalStore.weeklyChronicleEntries?.length ?? 0) >= beforeChronicleCount + expectation.chronicle.minEntriesAfterBoundary,
          `${sample.id} 周切换后没有新增周纪行条目。`,
        )
      }
      break
    case 'breeding_settlement':
      handleEndDay()
      assertRuntime(getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId !== beforeWeekId, `${sample.id} 日结后没有进入下一周。`)
      assertRuntime(breedingStore.lastBreedingContestSettlement?.weekId === beforeWeekId, `${sample.id} 育种周赛没有为上一周结算。`)
      break
    case 'fishpond_rollover':
      handleEndDay()
      assertRuntime(getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId !== beforeWeekId, `${sample.id} 日结后没有进入下一周。`)
      assertRuntime(fishPondStore.lastPondContestSettlement?.weekId === beforeWeekId, `${sample.id} 鱼塘周赛没有为上一周结算。`)
      break
    case 'theme_week_refresh':
      handleEndDay()
      assertRuntime(getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId !== beforeWeekId, `${sample.id} 日结后没有进入下一周。`)
      assertRuntime((goalStore.currentThemeWeek?.id ?? '') !== beforeThemeWeekId, `${sample.id} 新周主题没有刷新。`)
      break
    default:
      break
  }

  runtimeSummaries.push(
    `${sample.id}: route=${sample.recommendedRouteName}, tier=${sample.tier}, location=${gameStore.currentLocationGroup}, checks=${sample.smokeChecks.map(check => check.id).join(',')}`,
  )
}

for (const sample of BUILT_IN_SAMPLE_SAVES) {
  const envelope = sample.envelope ?? {}
  const meta = envelope.meta ?? {}
  const data = envelope.data ?? {}
  const game = data.game ?? {}
  const player = data.player ?? {}
  const goal = data.goal ?? {}
  const inventoryItems = Array.isArray(data.inventory?.items) ? data.inventory.items : []

  assertCheck(sample.tier === 'flagship' || sample.tier === 'regression', `${sample.id} 缺少有效 tier。`)
  assertCheck(typeof sample.recommendedRouteName === 'string' && sample.recommendedRouteName.length > 0, `${sample.id} 缺少推荐路由。`)
  assertCheck(Array.isArray(sample.focusAreas) && sample.focusAreas.length >= 2, `${sample.id} focusAreas 过弱。`)
  assertCheck(Array.isArray(sample.smokeChecks) && sample.smokeChecks.length >= 2, `${sample.id} smokeChecks 过弱。`)
  assertCheck(meta.saveVersion === 4, `${sample.id} 的 saveVersion 不是 4。`)
  assertCheck(Number.isFinite(game.year) && game.year >= 1, `${sample.id} 缺少有效的 game.year。`)
  assertCheck(['spring', 'summer', 'autumn', 'winter'].includes(game.season), `${sample.id} 缺少有效的 game.season。`)
  assertCheck(Number.isFinite(game.day) && game.day >= 1 && game.day <= 28, `${sample.id} 缺少有效的 game.day。`)
  assertCheck(typeof player.playerName === 'string' && player.playerName.length > 0, `${sample.id} 缺少玩家名。`)
  assertCheck(Number.isFinite(player.money) && player.money >= 0, `${sample.id} 缺少有效的玩家金钱。`)
  assertCheck(Array.isArray(goal.dailyGoals), `${sample.id} 缺少 goal.dailyGoals。`)
  assertCheck(Array.isArray(goal.longTermGoals), `${sample.id} 缺少 goal.longTermGoals。`)
  assertCheck(goal.currentThemeWeekState && typeof goal.currentThemeWeekState === 'object', `${sample.id} 缺少 currentThemeWeekState。`)
  assertCheck(Array.isArray(goal.weeklyMetricArchive?.snapshots), `${sample.id} 缺少 weeklyMetricArchive.snapshots。`)
  assertCheck(Array.isArray(player.economyTelemetry?.recentSnapshots), `${sample.id} 缺少 economyTelemetry.recentSnapshots。`)
  assertCheck(inventoryItems.every(item => typeof item?.itemId === 'string' && validItemIds.has(item.itemId)), `${sample.id} 存在无效背包物品 ID。`)

  infos.push(`${sample.id}: ${sample.tier} -> ${sample.recommendedRouteName}, Y${game.year} ${game.season} Day${game.day}, money=${player.money}`)
}

for (const sample of BUILT_IN_SAMPLE_SAVES) {
  await runRuntimeSmoke(sample)
}

if (errors.length > 0) {
  console.error('[qa-late-game-samples] FAILED')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('[qa-late-game-samples] OK')
for (const info of infos) {
  console.log(`- ${info}`)
}
for (const summary of runtimeSummaries) {
  console.log(`- runtime ${summary}`)
}
