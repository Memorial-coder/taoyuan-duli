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

def try_click_visible_text(page, text):
    locator = page.get_by_text(text, exact=False)
    for i in range(locator.count()):
        item = locator.nth(i)
        try:
            if item.is_visible():
                item.scroll_into_view_if_needed()
                item.click()
                page.wait_for_timeout(500)
                return True
        except Exception:
            continue
    return False

def body_text(page):
    try:
        return page.locator('body').inner_text(timeout=5000)
    except Exception:
        return ''

results = {'systems': {}, 'console_errors': [], 'page_errors': [], 'failed_requests': []}
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1400})
    page.set_default_timeout(12000)
    page.on('console', lambda msg: results['console_errors'].append(f'{msg.type}: {msg.text}') if msg.type == 'error' else None)
    page.on('pageerror', lambda exc: results['page_errors'].append(str(exc)))
    page.on('requestfailed', lambda req: results['failed_requests'].append(f'{req.url} :: {req.failure.error_text if req.failure else "failed"}'))

    # farm with endgame sample
    ensure_debug_api(page)
    page.evaluate("""async () => { await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('endgame_showcase') }""")
    page.wait_for_timeout(800)
    goto_hash(page, '/#/game/farm')
    farm = {'positive': {}, 'boundary': {}}
    farm['positive']['page_visible'] = any(k in body_text(page) for k in ['一键操作', '农场', '出货箱'])
    farm['positive']['batch_action_opened'] = try_click_visible_text(page, '一键操作')
    if farm['positive']['batch_action_opened']:
        farm['positive']['batch_water_or_harvest_visible'] = any(k in body_text(page) for k in ['一键浇水', '一键收获', '一键开垦'])
        try_click_visible_text(page, '取消')
    farm['boundary']['shipping_box_opened'] = try_click_visible_text(page, '出货箱')
    results['systems']['farm'] = farm

    # cooking
    goto_hash(page, '/#/game/cooking')
    cooking = {'positive': {}, 'boundary': {}}
    txt = body_text(page)
    cooking['positive']['page_visible'] = '可制作' in txt or '烹饪' in txt
    if try_click_visible_text(page, '可制作') or try_click_visible_text(page, '全部'):
        cooking['positive']['filter_toggle_clicked'] = True
    else:
        cooking['positive']['filter_toggle_clicked'] = False
    try:
        cards = page.locator('div.cursor-pointer')
        if cards.count() > 0:
            cards.nth(0).click()
            page.wait_for_timeout(500)
            cooking['positive']['recipe_modal_opened'] = '烹饪' in body_text(page)
        else:
            cooking['positive']['recipe_modal_opened'] = False
    except Exception:
        cooking['positive']['recipe_modal_opened'] = False
    cooking['boundary']['empty_or_makeable_hint_visible'] = any(k in body_text(page) for k in ['没有可制作的食谱', '与村民交好或观看电视可学习食谱'])
    results['systems']['cooking'] = cooking

    # workshop / processing
    goto_hash(page, '/#/game/workshop')
    workshop = {'positive': {}, 'boundary': {}}
    workshop['positive']['page_visible'] = len(body_text(page)) > 200
    workshop['boundary']['no_runtime_error'] = True
    results['systems']['workshop'] = workshop

    # upgrade
    goto_hash(page, '/#/game/upgrade')
    upgrade = {'positive': {}, 'boundary': {}}
    ub = body_text(page)
    upgrade['positive']['page_visible'] = len(ub) > 200
    upgrade['boundary']['no_runtime_error'] = True
    results['systems']['upgrade'] = upgrade

    browser.close()

print(json.dumps(results, ensure_ascii=False, indent=2))
