from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
import json

BASE_URL = 'http://127.0.0.1:5173'

def goto_hash(page, hash_path: str):
    page.goto(f'{BASE_URL}{hash_path}')
    try:
        page.wait_for_load_state('networkidle', timeout=10000)
    except PlaywrightTimeoutError:
        page.wait_for_timeout(1500)
    page.wait_for_timeout(600)

def ensure_debug_api(page):
    goto_hash(page, '/#/dev/late-game')
    page.wait_for_function('() => !!globalThis.__TAOYUAN_LATE_GAME_DEBUG__', timeout=15000)
    page.wait_for_timeout(300)

def visible_button_texts(page):
    texts = []
    buttons = page.locator('button')
    for i in range(buttons.count()):
        try:
            b = buttons.nth(i)
            if b.is_visible():
                t = b.inner_text().strip()
                if t:
                    texts.append(t)
        except Exception:
            pass
    return texts

out = {}
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1400})
    page.set_default_timeout(12000)

    ensure_debug_api(page)
    page.evaluate("""async () => { await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('breeding_specialist') }""")
    page.wait_for_timeout(800)
    goto_hash(page, '/#/game/breeding')
    out['breeding_buttons'] = visible_button_texts(page)
    out['breeding_body'] = page.locator('body').inner_text()[:2500]

    ensure_debug_api(page)
    page.evaluate("""async () => { await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('fishpond_operator') }""")
    page.wait_for_timeout(800)
    goto_hash(page, '/#/game/fishpond')
    out['fishpond_buttons'] = visible_button_texts(page)
    out['fishpond_body'] = page.locator('body').inner_text()[:2500]

    browser.close()
print(json.dumps(out, ensure_ascii=False, indent=2))
