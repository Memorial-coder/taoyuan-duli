import { expect, test, type Page } from '@playwright/test'

const sampleId = 'breeding_specialist'
const regionMapSampleId = 'region_map_showcase'
const regionAncientRoadSampleId = 'region_ancient_road_midgame'

async function openHome(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '桃源乡' })).toBeVisible()
  await expect(page.getByRole('button', { name: '新的旅程' })).toBeVisible()
}

async function startNewJourney(page: Page, playerName: string) {
  await page.getByTestId('new-journey-button').click()
  await page.getByTestId('privacy-agree-button').click()
  await page.getByTestId('char-name-input').fill(playerName)
  await page.getByTestId('char-create-next-button').click()
  await page.getByTestId('farm-option-standard').click()
  await page.getByTestId('confirm-start-journey-button').click()
}

async function loadBuiltInSample(page: Page, id: string) {
  await page.waitForFunction(() => typeof (window as any).__TAOYUAN_SAMPLE_SAVES__?.load === 'function')
  const loaded = await page.evaluate(async targetId => {
    const api = (window as any).__TAOYUAN_SAMPLE_SAVES__
    return api ? await api.load(targetId) : false
  }, id)
  expect(loaded).toBeTruthy()
}

async function waitForExpeditionAction(page: Page) {
  const retreatButton = page.getByTestId('region-expedition-retreat')
  const settleButton = page.getByTestId('region-expedition-settle')
  const choiceButton = page.locator('[data-testid^="region-expedition-choice-"]').first()
  const encounterButton = page.locator('[data-testid^="region-expedition-encounter-"]').first()
  const campButton = page.locator('[data-testid^="region-expedition-camp-"]').first()

  for (let i = 0; i < 12; i += 1) {
    if (await settleButton.isVisible().catch(() => false)) return 'settle'
    if (await retreatButton.isVisible().catch(() => false)) return 'retreat'
    if (await encounterButton.isVisible().catch(() => false)) {
      await encounterButton.click()
      await page.waitForTimeout(250)
      continue
    }
    if (await campButton.isVisible().catch(() => false)) {
      await campButton.click()
      await page.waitForTimeout(250)
      continue
    }
    if (await choiceButton.isVisible().catch(() => false)) return 'choice'
    await page.waitForTimeout(250)
  }

  throw new Error('No expedition action became available in time')
}

test.describe('web game smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, user: null })
      })
    })

    await page.route('**/api/public-config', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false })
      })
    })

    await page.route('**/api/taoyuan/ai/config', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false })
      })
    })

    await page.route('**/api/taoyuan/logs/gameplay/batch', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true })
      })
    })
  })

  test('can start a new local journey from the main menu', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '测试')

    await expect(page).toHaveURL(/#\/game(?:\/farm)?$/)
    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.getByTestId('status-bar')).toContainText('测试')
    await expect(page.getByTestId('farm-view')).toBeVisible()
  })

  test('can open region map before unlock and see unlock conditions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '小满')
    await page.goto('/#/game/region-map')

    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.getByText('古驿荒道').first()).toBeVisible()
    await expect(page.getByText('蜃潮泽地').first()).toBeVisible()
    await expect(page.getByText('云岚高地').first()).toBeVisible()
    await expect(page.getByText('村庄建设').first()).toBeVisible()
    await expect(page.getByText('博物馆捐赠').first()).toBeVisible()
    await expect(page.getByText('公会等级').first()).toBeVisible()
  })

  test('can load the built-in breeding sample in dev mode', async ({ page }) => {
    await openHome(page)
    await loadBuiltInSample(page, sampleId)
    await page.goto('/#/game/breeding')

    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.getByTestId('breeding-view')).toBeVisible()
    await expect(page.getByRole('button', { name: '育种台' })).toBeVisible()
    await expect(page.getByRole('button', { name: '图鉴' })).toBeVisible()
  })

  test('can load the built-in region map showcase in dev mode', async ({ page }) => {
    await openHome(page)
    await loadBuiltInSample(page, regionMapSampleId)
    await page.goto('/#/game/region-map')

    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.getByText('古驿荒道').first()).toBeVisible()
    await expect(page.getByText('蜃潮泽地').first()).toBeVisible()
    await expect(page.getByText('云岚高地').first()).toBeVisible()
    await expect(page.getByRole('button', { name: '巡行' }).first()).toBeVisible()
    await expect(page.locator('[data-testid^="region-boss-primary-"]').first()).toBeVisible()

    await page.goto('/#/game/shop')
    await expect(page.getByText('古驿荒道承接')).toBeVisible()
    await expect(page.getByRole('button', { name: '去任务板' })).toBeVisible()
    await expect(page.getByRole('button', { name: '去瀚海' })).toBeVisible()

    await page.goto('/#/game/fishpond')
    await expect(page.getByText('蜃潮泽地承接')).toBeVisible()
    await expect(page.getByRole('button', { name: '去博物馆' })).toBeVisible()
    await expect(page.getByRole('button', { name: '去邮箱' })).toBeVisible()

    await page.goto('/#/game/guild')
    await expect(page.getByText('云岚高地承接')).toBeVisible()
    await page.getByRole('button', { name: '去村庄建设' }).click()
    await expect(page).toHaveURL(/#\/game\/village-projects$/)
    await expect(page.getByText('云岚高地承接')).toBeVisible()
    await page.getByRole('button', { name: '去钱袋' }).click()
    await expect(page).toHaveURL(/#\/game\/wallet$/)
    await expect(page.getByText('云岚高地战备')).toBeVisible()
  })

  test('locked region only shows unlock notice instead of full expedition detail', async ({ page }) => {
    await openHome(page)
    await loadBuiltInSample(page, regionAncientRoadSampleId)
    await page.goto('/#/game/region-map')

    await expect(page.getByTestId('game-layout')).toBeVisible()

    const forcedLocked = await page.evaluate(() => {
      const api = (window as any).__TAOYUAN_REGION_MAP_DEBUG__
      if (!api || typeof api.setRegionUnlockedForDebug !== 'function') return false
      return api.setRegionUnlockedForDebug('mirage_marsh', false)
    })
    expect(forcedLocked).toBeTruthy()

    const lockedRegionCard = page
      .locator('[data-testid^="region-switch-"]')
      .filter({ hasText: '未解锁' })
      .first()

    await expect(lockedRegionCard).toBeVisible()
    await lockedRegionCard.click()

    await expect(page.getByText('当前区域尚未开放，不会展开路线、首领和事件操作。')).toBeVisible()
    await expect(page.locator('[data-testid^="region-route-primary-"]')).toHaveCount(0)
    await expect(page.locator('[data-testid^="region-boss-primary-"]')).toHaveCount(0)
  })

  test('blocked route click shows a reason instead of silently doing nothing', async ({ page }) => {
    await openHome(page)
    await loadBuiltInSample(page, regionMapSampleId)
    await page.goto('/#/game/region-map')

    await expect(page.getByTestId('game-layout')).toBeVisible()

    const blockedRouteButton = page.locator('[data-testid^="region-route-primary-"][aria-disabled="true"]').first()
    await expect(blockedRouteButton).toBeVisible()
    await blockedRouteButton.click({ force: true })

    await expect(page.getByText('无法出发')).toBeVisible()
    await expect(page.getByText('当前已有一条进行中的远征，请先收束当前远征记录。').first()).toBeVisible()
  })

  test('manual region expedition enters staged mode and can settle with reveal flow', async ({ page }) => {
    await openHome(page)
    await loadBuiltInSample(page, regionMapSampleId)
    await page.goto('/#/game/region-map')

    await expect(page.getByTestId('game-layout')).toBeVisible()

    const stage = page.getByTestId('region-expedition-stage')
    if (!(await stage.isVisible().catch(() => false))) {
      const started = await page.evaluate(async () => {
        const api = (window as any).__TAOYUAN_REGION_MAP_DEBUG__
        if (!api || typeof api.startFirstManualSession !== 'function') return false
        const result = await api.startFirstManualSession()
        return Boolean(result?.success)
      })
      expect(started).toBeTruthy()
      await expect(stage).toBeVisible()
    }

    const firstChoice = page.locator('[data-testid^="region-expedition-choice-"]').first()
    if (await firstChoice.isVisible().catch(() => false)) {
      await firstChoice.click()
    }

    await expect(page.getByTestId('region-expedition-primary-card')).toBeVisible()
    const nextAction = await waitForExpeditionAction(page)
    if (nextAction === 'choice' || nextAction === 'retreat') {
      await page.getByTestId('region-expedition-retreat').click()
    }

    await expect(page.getByTestId('region-expedition-settle')).toBeVisible()
    await page.getByTestId('region-expedition-settle').click()

    await expect(page.getByTestId('journey-settlement-reveal')).toBeVisible()
    await page.getByTestId('journey-settlement-next').click()
    await expect(page.getByTestId('journey-settlement-stage-reward')).toBeVisible()
  })

  test('settings dialog keeps modal width stable when font size shrinks on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openHome(page)
    await startNewJourney(page, '测试')

    const settingsDialog = page.getByTestId('settings-dialog')
    const fontSizeValue = page.getByTestId('settings-font-size-value')
    const fontSizeDecrease = page.getByTestId('settings-font-size-decrease')
    const fontSizeIncrease = page.getByTestId('settings-font-size-increase')
    const settingsOverlay = page.getByTestId('settings-dialog-overlay')

    const openMenu = async () => {
      await page.getByTestId('mobile-hub-button').click()
      await expect(page.getByTestId('mobile-map-menu')).toBeVisible()
    }

    const openSettingsFromMenu = async () => {
      await page.getByTestId('mobile-map-menu-open-settings').click()
      await expect(settingsDialog).toBeVisible()
      await page.getByTestId('settings-tab-display').click()
    }

    const setFontSize = async (target: number) => {
      for (let i = 0; i < 24; i += 1) {
        const current = Number((await fontSizeValue.textContent())?.trim() ?? NaN)
        expect(current).not.toBeNaN()
        if (current === target) return
        await (current > target ? fontSizeDecrease : fontSizeIncrease).click()
      }

      const finalValue = Number((await fontSizeValue.textContent())?.trim() ?? NaN)
      expect(finalValue).toBe(target)
    }

    const closeSettings = async () => {
      await settingsOverlay.click({ position: { x: 8, y: 8 } })
      await expect(settingsDialog).toHaveCount(0)
    }

    const measureBox = async (locator: ReturnType<Page['locator']>) => {
      await expect(locator).toBeVisible()
      const box = await locator.boundingBox()
      expect(box).not.toBeNull()
      return box!
    }

    const measureMenuControls = async () => {
      await openMenu()
      const primaryEntry = page.getByTestId('mobile-map-menu-primary-entry')
      const quickLinkChip = page.locator('[data-testid^="mobile-map-quick-link-"]').first()
      const toolEntry = page.getByTestId('mobile-map-menu-open-settings')
      const farmTile = page.getByTestId('mobile-map-loc-farm')

      const primaryBox = await measureBox(primaryEntry)
      const quickLinkBox = await measureBox(quickLinkChip)
      const toolEntryBox = await measureBox(toolEntry)
      const farmTileBox = await measureBox(farmTile)

      return {
        primaryHeight: primaryBox.height,
        quickLinkWidth: quickLinkBox.width,
        toolEntryHeight: toolEntryBox.height,
        farmTileWidth: farmTileBox.width
      }
    }

    const expectShrunk = (
      previous: { primaryHeight: number; quickLinkWidth: number; toolEntryHeight: number; farmTileWidth: number },
      next: { primaryHeight: number; quickLinkWidth: number; toolEntryHeight: number; farmTileWidth: number }
    ) => {
      expect(next.primaryHeight).toBeLessThan(previous.primaryHeight)
      expect(next.quickLinkWidth).toBeLessThan(previous.quickLinkWidth)
      expect(next.toolEntryHeight).toBeLessThan(previous.toolEntryHeight)
      expect(next.farmTileWidth).toBeLessThan(previous.farmTileWidth)
    }

    const expectGrown = (
      previous: { primaryHeight: number; quickLinkWidth: number; toolEntryHeight: number; farmTileWidth: number },
      next: { primaryHeight: number; quickLinkWidth: number; toolEntryHeight: number; farmTileWidth: number }
    ) => {
      expect(next.primaryHeight).toBeGreaterThan(previous.primaryHeight)
      expect(next.quickLinkWidth).toBeGreaterThan(previous.quickLinkWidth)
      expect(next.toolEntryHeight).toBeGreaterThan(previous.toolEntryHeight)
      expect(next.farmTileWidth).toBeGreaterThan(previous.farmTileWidth)
    }

    await openMenu()
    await openSettingsFromMenu()
    await expect(fontSizeValue).toHaveText('16')

    const baselineWidth = await settingsDialog.evaluate(element => element.getBoundingClientRect().width)
    await setFontSize(8)
    const compactWidth = await settingsDialog.evaluate(element => element.getBoundingClientRect().width)

    expect(compactWidth).toBeGreaterThanOrEqual(baselineWidth - 4)
    expect(compactWidth).toBeGreaterThanOrEqual(316)

    const tabLocators = [
      page.getByTestId('settings-tab-general'),
      page.getByTestId('settings-tab-display'),
      page.getByTestId('settings-tab-notification')
    ]
    for (const tab of tabLocators) {
      await expect(tab).toBeVisible()
    }
    const tabRows = await Promise.all(tabLocators.map(async tab => (await tab.boundingBox())?.y ?? 0))
    expect(Math.max(...tabRows) - Math.min(...tabRows)).toBeLessThanOrEqual(4)

    await expect(page.getByTestId('settings-font-size-card')).toBeVisible()
    await expect(fontSizeValue).toBeVisible()
    await expect(page.getByTestId('settings-theme-dark')).toBeVisible()
    await expect(page.getByTestId('settings-theme-warm')).toBeVisible()
    await expect(page.getByTestId('settings-theme-ink')).toBeVisible()
    await expect(page.getByTestId('settings-theme-parchment')).toBeVisible()
    await expect(page.getByTestId('settings-save-manager-button')).toBeVisible()

    await setFontSize(16)
    await closeSettings()

    const size16 = await measureMenuControls()

    await openSettingsFromMenu()
    await setFontSize(15)
    await closeSettings()
    const size15 = await measureMenuControls()
    expectShrunk(size16, size15)

    await openSettingsFromMenu()
    await setFontSize(14)
    await closeSettings()
    const size14 = await measureMenuControls()
    expectShrunk(size15, size14)

    await openSettingsFromMenu()
    await setFontSize(13)
    await closeSettings()
    const size13 = await measureMenuControls()
    expectShrunk(size14, size13)

    await openSettingsFromMenu()
    await setFontSize(12)
    await closeSettings()
    const size12 = await measureMenuControls()
    expectShrunk(size13, size12)

    await openSettingsFromMenu()
    await setFontSize(17)
    await closeSettings()
    const size17 = await measureMenuControls()
    expectGrown(size16, size17)

    await openSettingsFromMenu()
    await setFontSize(18)
    await closeSettings()
    const size18 = await measureMenuControls()
    expectGrown(size17, size18)
  })

  test('region map mobile layout keeps rail scoped and actions reachable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openHome(page)
    await loadBuiltInSample(page, regionMapSampleId)
    await page.goto('/#/game/region-map')

    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.locator('[data-testid^="region-switch-"]')).toHaveCount(3)
    await expect(page.getByTestId('region-switch-ancient_road')).toBeVisible()
    await expect(page.getByText('先选定这趟要展开查看的区域')).toBeVisible()

    await page.getByTestId('region-switch-ancient_road').click()
    const rail = page.getByTestId('region-map-rail-ancient_road')
    await expect(rail).toBeVisible()

    const railScrollable = await rail.evaluate(element => element.scrollWidth > element.clientWidth)
    expect(railScrollable).toBeTruthy()

    const railScroll = await rail.evaluate(element => {
      const before = element.scrollLeft
      element.scrollLeft = before + 140
      return { before, after: element.scrollLeft }
    })
    expect(railScroll.after).toBeGreaterThanOrEqual(railScroll.before)

    const rootOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(rootOverflow).toBeLessThanOrEqual(4)

    const stage = page.getByTestId('region-expedition-stage')
    if (!(await stage.isVisible().catch(() => false))) {
      const started = await page.evaluate(async () => {
        const api = (window as any).__TAOYUAN_REGION_MAP_DEBUG__
        if (!api || typeof api.startFirstManualSession !== 'function') return false
        const result = await api.startFirstManualSession()
        return Boolean(result?.success)
      })
      expect(started).toBeTruthy()
      await expect(stage).toBeVisible()
    }

    await expect(page.getByTestId('region-expedition-action-dock')).toBeVisible()

    const firstChoice = page.locator('[data-testid^="region-expedition-choice-"]').first()
    if (await firstChoice.isVisible().catch(() => false)) {
      await firstChoice.click()
    }

    const nextAction = await waitForExpeditionAction(page)
    if (nextAction === 'choice' || nextAction === 'retreat') {
      await page.getByTestId('region-expedition-retreat').click()
    }

    await expect(page.getByTestId('region-expedition-settle')).toBeVisible()
    await page.getByTestId('region-expedition-settle').click()

    await expect(page.getByTestId('journey-settlement-reveal')).toBeVisible()
    await expect(page.getByTestId('journey-settlement-stage-tabs')).toBeVisible()

    if (await page.getByTestId('journey-settlement-next').isVisible().catch(() => false)) {
      await page.getByTestId('journey-settlement-next').click()
    }
    if (await page.getByTestId('journey-settlement-next').isVisible().catch(() => false)) {
      await page.getByTestId('journey-settlement-next').click()
    }

    await expect(page.getByTestId('journey-settlement-stage-aftermath')).toBeVisible()
    await expect(page.getByRole('button', { name: '前往' }).first()).toBeVisible()
  })
})
