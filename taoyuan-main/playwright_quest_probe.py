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


def body_text(page):
    try:
        return page.locator('body').inner_text(timeout=5000)
    except Exception:
        return ''


out = {}
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1400})
    page.set_default_timeout(12000)
    ensure_debug_api(page)
    page.evaluate("""async () => {
      await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('breeding_specialist')
      globalThis.__TAOYUAN_LATE_GAME_DEBUG__.injectSpecialOrder(2)
    }""")
    page.wait_for_timeout(800)
    goto_hash(page, '/#/game/quest')
    out['initial_body'] = body_text(page)
    out['special_order_text_count'] = page.get_by_text('特殊订单', exact=False).count()
    out['accept_order_text_count'] = page.get_by_text('接取订单', exact=False).count()
    out['submit_task_text_count'] = page.get_by_text('提交任务', exact=False).count()
    buttons = page.locator('button').all_inner_texts()
    out['button_texts'] = buttons[:80]
    browser.close()
print(json.dumps(out, ensure_ascii=False, indent=2))
