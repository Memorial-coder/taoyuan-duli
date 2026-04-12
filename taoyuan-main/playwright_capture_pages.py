from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

BASE_URL = 'http://127.0.0.1:5173'
OUT_DIR = 'd:/taoyuan-latest/taoyuan-duli/taoyuan-main/.audit-shots'


def goto_hash(page, hash_path: str):
    page.goto(f'{BASE_URL}{hash_path}')
    try:
        page.wait_for_load_state('networkidle', timeout=10000)
    except PlaywrightTimeoutError:
        page.wait_for_timeout(1200)
    page.wait_for_timeout(800)


def ensure_debug_api(page):
    goto_hash(page, '/#/dev/late-game')
    page.wait_for_function('() => !!globalThis.__TAOYUAN_LATE_GAME_DEBUG__', timeout=15000)
    page.wait_for_timeout(300)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1400})
    ensure_debug_api(page)
    page.evaluate("""async () => {
      await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('late_economy_foundation')
    }""")
    page.wait_for_timeout(800)
    for route in ['farm', 'quest', 'shop', 'breeding', 'hanhai', 'museum', 'village', 'wallet']:
        goto_hash(page, f'/#/game/{route}')
        page.screenshot(path=f'{OUT_DIR}/{route}.png', full_page=True)
    ensure_debug_api(page)
    page.evaluate("""async () => {
      await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('breeding_specialist')
      globalThis.__TAOYUAN_LATE_GAME_DEBUG__.injectSpecialOrder(2)
    }""")
    page.wait_for_timeout(800)
    goto_hash(page, '/#/game/quest')
    page.screenshot(path=f'{OUT_DIR}/quest_breeding_specialist.png', full_page=True)
    browser.close()
