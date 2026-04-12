from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
import json
import sys
import time

BASE_URL = 'http://127.0.0.1:5173'

GAME_ROUTES = [
    'farm', 'animal', 'home', 'cottage', 'village', 'shop', 'forage', 'fishing', 'mining',
    'cooking', 'workshop', 'upgrade', 'inventory', 'skills', 'achievement', 'wallet',
    'quest', 'mail', 'charinfo', 'breeding', 'museum', 'guild', 'hanhai', 'fishpond', 'decoration'
]


def goto_hash(page, hash_path: str):
    page.goto(f'{BASE_URL}{hash_path}')
    try:
        page.wait_for_load_state('networkidle', timeout=10000)
    except PlaywrightTimeoutError:
        page.wait_for_timeout(1200)
    page.wait_for_timeout(500)


def short_text(text: str, limit: int = 180):
    text = ' '.join((text or '').split())
    return text[:limit]


def collect_page_snapshot(page):
    try:
        body_text = page.locator('body').inner_text(timeout=4000)
    except Exception:
        body_text = ''
    try:
        buttons = page.locator('button').evaluate_all(
            "els => els.map(e => (e.innerText || '').trim()).filter(Boolean).slice(0, 12)"
        )
    except Exception:
        buttons = []
    return {
        'hash': page.evaluate('location.hash'),
        'title': page.title(),
        'body_preview': short_text(body_text),
        'buttons': buttons,
    }


def ensure_debug_api(page):
    if '/#/dev/late-game' not in page.evaluate('location.href'):
        goto_hash(page, '/#/dev/late-game')
    page.wait_for_function('() => !!globalThis.__TAOYUAN_LATE_GAME_DEBUG__', timeout=15000)
    page.wait_for_timeout(300)


def main():
    console_errors = []
    page_errors = []
    failed_requests = []
    report = {
        'checked_routes': [],
        'route_failures': [],
        'dynamic_findings': [],
        'samples': [],
        'console_errors': console_errors,
        'page_errors': page_errors,
        'failed_requests': failed_requests,
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1200})
        page.set_default_timeout(10000)

        page.on('console', lambda msg: console_errors.append(f'{msg.type}: {msg.text}') if msg.type == 'error' else None)
        page.on('pageerror', lambda exc: page_errors.append(str(exc)))
        page.on('requestfailed', lambda req: failed_requests.append(f'{req.url} :: {req.failure.error_text if req.failure else "failed"}'))

        # Main menu smoke
        goto_hash(page, '/#/')
        report['main_menu'] = collect_page_snapshot(page)

        # Late-game debug page
        ensure_debug_api(page)
        report['debug_page'] = collect_page_snapshot(page)

        sample_list = page.evaluate('() => globalThis.__TAOYUAN_LATE_GAME_DEBUG__.listSamples()')
        report['samples'] = sample_list
        sample_ids = {sample['id'] for sample in sample_list}

        # Dynamic check 1: late-game sample theme refresh behavior
        if 'late_economy_foundation' in sample_ids:
            ensure_debug_api(page)
            ok = page.evaluate('''async () => {
                return await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('late_economy_foundation')
            }''')
            if not ok:
                report['dynamic_findings'].append({
                    'severity': 'high',
                    'title': '无法载入 late_economy_foundation 样例档',
                    'detail': '开发态动态验收入口失效，无法进入后期综合样例。'
                })
            else:
                before_summary = page.evaluate('() => globalThis.__TAOYUAN_LATE_GAME_DEBUG__.getSummary()')
                page.evaluate('''() => {
                    const s = globalThis.__TAOYUAN_LATE_GAME_DEBUG__.getSummary()
                    globalThis.__TAOYUAN_LATE_GAME_DEBUG__.applyCalendar({
                        year: s.date.year,
                        season: s.date.season,
                        day: s.date.day,
                        hour: s.date.hour,
                    })
                }''')
                page.wait_for_timeout(500)
                after_summary = page.evaluate('() => globalThis.__TAOYUAN_LATE_GAME_DEBUG__.getSummary()')
                report['theme_refresh_check'] = {
                    'before': before_summary.get('themeWeek'),
                    'after': after_summary.get('themeWeek'),
                }
                before_theme = (before_summary.get('themeWeek') or {}).get('id') if before_summary.get('themeWeek') else None
                after_theme = (after_summary.get('themeWeek') or {}).get('id') if after_summary.get('themeWeek') else None
                if before_theme and after_theme and before_theme != after_theme:
                    report['dynamic_findings'].append({
                        'severity': 'high',
                        'title': '同一天刷新主题周会改写样例档中的当前主题',
                        'detail': f'late_economy_foundation 样例在刷新前主题为 {before_theme}，刷新后变成 {after_theme}。这说明主题周并非稳定按周保存/轮换。'
                    })

        # Route-by-route smoke on late economy sample
        if 'late_economy_foundation' in sample_ids:
            ensure_debug_api(page)
            page.evaluate('''async () => {
                await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('late_economy_foundation')
            }''')
            page.wait_for_timeout(500)
            for route in GAME_ROUTES:
                start_console = len(console_errors)
                start_page_errors = len(page_errors)
                start_failed = len(failed_requests)
                try:
                    goto_hash(page, f'/#/game/{route}')
                    page.wait_for_selector('body', timeout=5000)
                    snapshot = collect_page_snapshot(page)
                    in_layout = '体力' in snapshot['body_preview'] or '金币' in snapshot['body_preview'] or '/#/game/' in snapshot['hash']
                    route_result = {
                        'route': route,
                        'snapshot': snapshot,
                        'new_console_errors': console_errors[start_console:],
                        'new_page_errors': page_errors[start_page_errors:],
                        'new_failed_requests': failed_requests[start_failed:],
                    }
                    report['checked_routes'].append(route_result)
                    if not snapshot['hash'].endswith(f'/game/{route}') or not in_layout:
                        report['route_failures'].append({
                            'route': route,
                            'reason': '页面未稳定进入目标路由或游戏布局未正常出现',
                            'snapshot': snapshot,
                        })
                except Exception as exc:
                    report['route_failures'].append({
                        'route': route,
                        'reason': str(exc),
                    })

        # Focused interaction checks using breeding sample
        if 'breeding_specialist' in sample_ids:
            ensure_debug_api(page)
            page.evaluate('''async () => {
                await globalThis.__TAOYUAN_LATE_GAME_DEBUG__.loadSample('breeding_specialist')
            }''')
            page.wait_for_timeout(500)

            # Inject special order and inspect QuestView
            ensure_debug_api(page)
            page.evaluate('() => globalThis.__TAOYUAN_LATE_GAME_DEBUG__.injectSpecialOrder(2)')
            goto_hash(page, '/#/game/quest')
            quest_snapshot = collect_page_snapshot(page)
            report['quest_interaction'] = quest_snapshot
            if '特殊订单' not in quest_snapshot['body_preview'] and '订单' not in page.locator('body').inner_text():
                report['dynamic_findings'].append({
                    'severity': 'medium',
                    'title': '注入特殊订单后任务页未明显展示订单入口',
                    'detail': '动态验收中向调试 API 注入测试订单后，任务页未能在首屏清晰体现特殊订单状态。'
                })
            else:
                try:
                    order_cards = page.locator('text=特殊订单')
                    if order_cards.count() > 0:
                        order_cards.first.click()
                        page.wait_for_timeout(400)
                        report['quest_modal_after_click'] = collect_page_snapshot(page)
                except Exception:
                    pass

            # ShopView smoke with recommendation section
            goto_hash(page, '/#/game/shop')
            report['shop_interaction'] = collect_page_snapshot(page)
            try:
                weekly_btn = page.get_by_text('每周精选', exact=False)
                if weekly_btn.count() > 0:
                    weekly_btn.first.click()
                    page.wait_for_timeout(300)
                    report['shop_after_weekly_click'] = collect_page_snapshot(page)
            except Exception:
                pass

            # HanhaiView smoke
            goto_hash(page, '/#/game/hanhai')
            report['hanhai_interaction'] = collect_page_snapshot(page)

            # BreedingView smoke
            goto_hash(page, '/#/game/breeding')
            report['breeding_interaction'] = collect_page_snapshot(page)

        browser.close()

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(json.dumps({'fatal': str(exc)}, ensure_ascii=False, indent=2))
        sys.exit(1)
