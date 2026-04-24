import { expect, test, type Page } from '@playwright/test'

const sampleId = 'breeding_specialist'

async function openHome(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('main-menu')).toBeVisible()
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

test.describe('web game smoke', () => {
  test('can start a new local journey from the main menu', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '测试')

    await expect(page).toHaveURL(/#\/game(?:\/farm)?$/)
    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.getByTestId('status-bar')).toContainText('测试')
    await expect(page.getByTestId('farm-view')).toBeVisible()
  })

  test('can load the built-in breeding sample in dev mode', async ({ page }) => {
    await openHome(page)
    await loadBuiltInSample(page, sampleId)
    await page.goto('/#/game/breeding')

    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.getByTestId('breeding-view')).toBeVisible()
    await expect(page.getByText('育种台', { exact: false })).toBeVisible()
    await expect(page.getByText('图鉴', { exact: false })).toBeVisible()
  })
})
