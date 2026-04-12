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

    # ----- Breeding -----
    ensure_debug_api(page)
    page.evaluate("""async () => { await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('breeding_specialist') }""")
    page.wait_for_timeout(800)
    goto_hash(page, '/#/game/breeding')
    breeding = {'positive': {}, 'boundary': {}}
    breeding['positive']['page_visible'] = '种子箱' in body_text(page) and '育种研究' in body_text(page)
    if try_click_visible_text(page, '育种'):
        breeding['positive']['breeding_select_opened'] = '开始育种' in body_text(page)
        if breeding['positive']['breeding_select_opened']:
            # choose 2 seeds then start
            selectable = page.locator('button, div').filter(has_text='G')
            clicked = 0
            for i in range(min(20, selectable.count())):
                try:
                    item = selectable.nth(i)
                    if item.is_visible():
                        item.click()
                        page.wait_for_timeout(200)
                        clicked += 1
                        if clicked >= 2:
                            break
                except Exception:
                    pass
            breeding['positive']['selected_seed_count'] = clicked
            breeding['positive']['start_breeding_clicked'] = try_click_visible_text(page, '开始育种')
    else:
        breeding['positive']['breeding_select_opened'] = False
    # boundary: open research upgrade and ensure button exists/disabled or works
    goto_hash(page, '/#/game/breeding')
    breeding['boundary']['research_section_visible'] = '育种研究' in body_text(page)
    breeding['boundary']['upgrade_research_button_visible'] = '升级研究' in body_text(page)
    results['systems']['breeding'] = breeding

    # ----- Fishpond -----
    ensure_debug_api(page)
    page.evaluate("""async () => { await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('fishpond_operator') }""")
    page.wait_for_timeout(800)
    goto_hash(page, '/#/game/fishpond')
    fishpond = {'positive': {}, 'boundary': {}}
    txt = body_text(page)
    fishpond['positive']['page_visible'] = '鱼塘' in txt and '繁殖' in txt
    fishpond['positive']['feed_clicked'] = try_click_visible_text(page, '喂食')
    fishpond['positive']['collect_clicked'] = try_click_visible_text(page, '收取')
    # boundary: full pond add-fish button may fail or be absent
    fishpond['boundary']['add_fish_area_visible'] = '放入' in body_text(page) or '鱼塘空空如也' in body_text(page)
    results['systems']['fishpond'] = fishpond

    # ----- Hanhai -----
    ensure_debug_api(page)
    page.evaluate("""async () => { await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('endgame_showcase') }""")
    page.wait_for_timeout(800)
    goto_hash(page, '/#/game/hanhai')
    hanhai = {'positive': {}, 'boundary': {}}
    htxt = body_text(page)
    hanhai['positive']['page_visible'] = '瀚海' in htxt and ('遗迹勘探' in htxt or '瀚海赌坊' in htxt)
    if try_click_visible_text(page, '遗迹勘探'):
        hanhai['positive']['relic_tab_opened'] = '遗迹主题' in body_text(page) or '勘探' in body_text(page)
        hanhai['positive']['explore_clicked'] = try_click_visible_text(page, '勘探') or try_click_visible_text(page, '探索')
    else:
        hanhai['positive']['relic_tab_opened'] = False
        hanhai['positive']['explore_clicked'] = False
    goto_hash(page, '/#/game/hanhai')
    hanhai['boundary']['casino_tab_clickable'] = try_click_visible_text(page, '瀚海赌坊')
    if hanhai['boundary']['casino_tab_clickable']:
        hanhai['boundary']['challenge_or_bet_visible'] = any(k in body_text(page) for k in ['挑战', '下注', '扑克'])
    results['systems']['hanhai'] = hanhai

    # ----- Museum -----
    ensure_debug_api(page)
    page.evaluate("""async () => { await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('endgame_showcase') }""")
    page.wait_for_timeout(800)
    goto_hash(page, '/#/game/museum')
    museum = {'positive': {}, 'boundary': {}}
    mtxt = body_text(page)
    museum['positive']['page_visible'] = '可捐赠物品' in mtxt or '捐赠进度' in mtxt
    museum['positive']['quick_donate_clicked'] = try_click_visible_text(page, '捐赠')
    museum['boundary']['claim_button_visible'] = '领取' in body_text(page)
    results['systems']['museum'] = museum

    browser.close()

print(json.dumps(results, ensure_ascii=False, indent=2))
