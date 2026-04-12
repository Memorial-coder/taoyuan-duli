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


def get_logs(page):
    return page.evaluate("""() => {
      const key = Object.keys(localStorage).find(k => k.includes('log_history'))
      if (!key) return []
      try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
    }""")


def get_latest_log_texts(page, count=8):
    logs = get_logs(page)
    return [str(item.get('msg', '')) for item in logs[-count:]]


def try_click_text(page, text, exact=False):
    locator = page.get_by_text(text, exact=exact)
    count = locator.count()
    for i in range(count):
        item = locator.nth(i)
        try:
            if item.is_visible():
                item.scroll_into_view_if_needed()
                item.click()
                page.wait_for_timeout(400)
                return True
        except Exception:
            continue
    return False


def body_text(page):
    try:
        return page.locator('body').inner_text(timeout=5000)
    except Exception:
        return ''


results = {
    'systems': {},
    'console_errors': [],
    'page_errors': [],
    'failed_requests': [],
}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1400})
    page.set_default_timeout(12000)

    page.on('console', lambda msg: results['console_errors'].append(f'{msg.type}: {msg.text}') if msg.type == 'error' else None)
    page.on('pageerror', lambda exc: results['page_errors'].append(str(exc)))
    page.on('requestfailed', lambda req: results['failed_requests'].append(f'{req.url} :: {req.failure.error_text if req.failure else "failed"}'))

    # ---------- Shop ----------
    ensure_debug_api(page)
    page.evaluate("""async () => { await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('endgame_showcase') }""")
    page.wait_for_timeout(800)
    goto_hash(page, '/#/game/shop')
    shop_result = {'positive': {}, 'boundary': {}}
    shop_before_logs = get_latest_log_texts(page, 12)
    if try_click_text(page, '为你推荐'):
        page.wait_for_timeout(300)
    body = body_text(page)
    if '为你推荐' in body:
        rec_cards = page.locator('text=为你推荐').count()
        shop_result['positive']['recommendation_section_visible'] = rec_cards > 0
    # positive: open first catalog item and buy if possible
    clicked = False
    for name in ['为你推荐', '本期货架', '每周精选']:
        try_click_text(page, name)
    clickable = page.locator('div.cursor-pointer').all()
    for el in clickable[:12]:
        try:
            el.click()
            page.wait_for_timeout(400)
            if '购买' in body_text(page) or '签约' in body_text(page) or '收藏' in body_text(page):
                clicked = True
                break
        except Exception:
            pass
    shop_result['positive']['item_modal_opened'] = clicked
    if clicked:
        if try_click_text(page, '购买', exact=False) or try_click_text(page, '签约', exact=False) or try_click_text(page, '收藏', exact=False):
            page.wait_for_timeout(600)
            shop_result['positive']['buy_action_clicked'] = True
        else:
            shop_result['positive']['buy_action_clicked'] = False
    else:
        shop_result['positive']['buy_action_clicked'] = False
    shop_after_logs = get_latest_log_texts(page, 12)
    shop_result['positive']['new_logs'] = [x for x in shop_after_logs if x not in shop_before_logs][-6:]
    # boundary: sell all when no sellable item / open confirm and cancel
    goto_hash(page, '/#/game/shop')
    try_click_text(page, '出售', exact=False)
    page.wait_for_timeout(300)
    shop_result['boundary']['sell_tab_visible'] = '出售物品' in body_text(page)
    if try_click_text(page, '一键全部出售', exact=False):
        page.wait_for_timeout(300)
        shop_result['boundary']['sell_all_confirm_opened'] = '确认一键出售' in body_text(page)
        try_click_text(page, '取消', exact=False)
    else:
        shop_result['boundary']['sell_all_confirm_opened'] = False
    results['systems']['shop'] = shop_result

    # ---------- Quest ----------
    ensure_debug_api(page)
    page.evaluate("""async () => {
      await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('breeding_specialist')
      globalThis.__TAOYUAN_LATE_GAME_DEBUG__.injectSpecialOrder(2)
    }""")
    page.wait_for_timeout(800)
    goto_hash(page, '/#/game/quest')
    quest_result = {'positive': {}, 'boundary': {}}
    quest_result['positive']['special_order_visible'] = '特殊订单' in body_text(page)
    if try_click_text(page, '特殊订单', exact=False):
        quest_result['positive']['special_order_modal_opened'] = '接取订单' in body_text(page) or '提交任务' in body_text(page)
        if try_click_text(page, '接取订单', exact=False):
            page.wait_for_timeout(600)
            quest_result['positive']['special_order_accept_clicked'] = True
        else:
            quest_result['positive']['special_order_accept_clicked'] = False
    else:
        quest_result['positive']['special_order_modal_opened'] = False
        quest_result['positive']['special_order_accept_clicked'] = False
    # boundary: open active quest and verify disabled submit when progress insufficient
    if try_click_text(page, '进行中', exact=False):
        page.wait_for_timeout(300)
    qbody = body_text(page)
    quest_result['boundary']['active_section_visible'] = '进行中' in qbody
    try:
        submit_btn = page.get_by_text('提交任务', exact=False)
        quest_result['boundary']['submit_button_count'] = submit_btn.count()
        if submit_btn.count() > 0:
            quest_result['boundary']['some_submit_disabled'] = any([submit_btn.nth(i).is_disabled() for i in range(min(3, submit_btn.count()))])
        else:
            quest_result['boundary']['some_submit_disabled'] = False
    except Exception:
        quest_result['boundary']['some_submit_disabled'] = False
    results['systems']['quest'] = quest_result

    # ---------- Wallet ----------
    ensure_debug_api(page)
    page.evaluate("""async () => { await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('endgame_showcase') }""")
    page.wait_for_timeout(800)
    goto_hash(page, '/#/game/wallet')
    wallet_result = {'positive': {}, 'boundary': {}}
    wbody = body_text(page)
    wallet_result['positive']['wallet_page_visible'] = '钱包流派' in wbody or '额度兑换' in wbody
    # positive: click first unlock/select style button
    for text in ['可选择', '解锁', '使用中']:
        if try_click_text(page, text, exact=False):
            wallet_result['positive']['archetype_or_node_click_worked'] = True
            break
    else:
        wallet_result['positive']['archetype_or_node_click_worked'] = False
    # boundary: open reset confirm and cancel
    if try_click_text(page, '重置流派', exact=False):
        page.wait_for_timeout(300)
        wallet_result['boundary']['reset_confirm_opened'] = '重置钱包流派' in body_text(page)
        try_click_text(page, '取消', exact=False)
    else:
        wallet_result['boundary']['reset_confirm_opened'] = False
    results['systems']['wallet'] = wallet_result

    # ---------- Village / NPC ----------
    ensure_debug_api(page)
    page.evaluate("""async () => { await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('endgame_showcase') }""")
    page.wait_for_timeout(800)
    goto_hash(page, '/#/game/village')
    village_result = {'positive': {}, 'boundary': {}}
    vbody = body_text(page)
    village_result['positive']['village_project_section_visible'] = '村庄建设' in vbody
    if try_click_text(page, '启用维护', exact=False) or try_click_text(page, '补缴维护', exact=False):
        page.wait_for_timeout(600)
        village_result['positive']['maintenance_action_clicked'] = True
    else:
        village_result['positive']['maintenance_action_clicked'] = False
    # boundary: if project button exists but disabled due to prerequisites
    try:
        buttons = page.locator('button').all_inner_texts()
    except Exception:
        buttons = []
    village_result['boundary']['has_project_related_buttons'] = any(any(k in b for k in ['维护', '建设', '捐赠', '领取']) for b in buttons)
    results['systems']['village'] = village_result

    browser.close()

print(json.dumps(results, ensure_ascii=False, indent=2))
