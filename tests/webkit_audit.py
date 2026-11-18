"""Family Smoothies handoff approach: Python Playwright, iPhone touch, finite frames.
Run with PLAYWRIGHT_BROWSERS_PATH="$PWD/.pw" .wk/bin/python tests/webkit_audit.py
Requires localhost-only private preview on 4175. Evidence stays in ignored private/.
"""
import asyncio, json, pathlib
from playwright.async_api import async_playwright

OUT = pathlib.Path('private/webkit-audit')
URL = 'http://127.0.0.1:4175/'
FINITE = 'document.getAnimations().filter(a => isFinite(a.effect.getComputedTiming().endTime))'
HOOK = """(() => {window.__starts=0; const o=document.startViewTransition?.bind(document);
if(o) document.startViewTransition=cb=>{window.__starts++;return window.__t=o(cb)};})()"""
SOURCE = json.loads(pathlib.Path('private/draft-source.json').read_text())
assert SOURCE.get('mode') == 'published', 'Audit requires an actual saved Published snapshot'
EXPECTED = [row for row in SOURCE['rows'][1:] if row[0]]
CONFIRMED = sum(row[19] is True or row[19] == 'TRUE' for row in EXPECTED)
OVERFLOW = """() => ({width:innerWidth, scroll:document.documentElement.scrollWidth,
bad:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();
return r.width && getComputedStyle(e).visibility!=='hidden' && (r.left < -1 || r.right > innerWidth+1)
&& !e.closest('.date-strip')}).map(e=>e.tagName+'.'+e.className)})"""

async def visible(page, name):
    await page.wait_for_function("n=>!document.querySelector('#'+n+'-view').hidden", arg=name)
    assert await page.locator('.view:visible').count() == 1
    assert await page.locator('[aria-current=page]').get_attribute('data-view') == name

async def frames(page):
    await page.tap('[data-view=budget]')
    await page.wait_for_function("document.querySelector('#screen').getAnimations().length>0")
    await page.evaluate(FINITE+'.forEach(a=>a.pause())')
    for ms in [0, 100, 200, 300]:
        await page.evaluate(FINITE+f'.forEach(a=>a.currentTime={ms})')
        assert not await page.locator('#budget-view').is_hidden()
        assert await page.locator('.budget-total').is_visible()
        await page.screenshot(path=str(OUT/f'frame-{ms}.png'))
    await page.evaluate(FINITE+'.forEach(a=>a.finish())')


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report={'checks':[], 'failures':[], 'errors':[]}
    async with async_playwright() as p:
        browser=await p.webkit.launch()
        report['browser']=browser.version
        for width,height in [(320,568),(360,780),(375,812),(390,844),(430,932),(844,390)]:
            ctx=await browser.new_context(**{**p.devices['iPhone 13'],'viewport':{'width':width,'height':height}})
            page=await ctx.new_page()
            page.on('pageerror',lambda e:report['errors'].append(str(e)))
            await page.goto(URL+'#itinerary')
            await page.wait_for_selector('.card')
            assert await page.locator('.card').count()==len(EXPECTED)
            assert await page.locator('.card.confirmed').count()==CONFIRMED
            assert await page.locator('.card.tentative').count()==len(EXPECTED)-CONFIRMED
            assert sorted(await page.locator('.card h3').all_text_contents())==sorted(row[0] for row in EXPECTED)
            for view in ['itinerary','budget','notes']:
                await page.tap('[data-view='+view+']')
                await visible(page,view)
                await page.wait_for_timeout(400)
                result=await page.evaluate(OVERFLOW)
                if result['bad'] or result['width']!=result['scroll']:
                    report['failures'].append({'size':[width,height],'view':view,'overflow':result})
                await page.screenshot(path=str(OUT/f'{width}-{height}-{view}.png'),full_page=True)
                if view=='itinerary':
                    await page.screenshot(path=str(OUT/f'{width}-viewport.png'))
            report['checks'].append(f'{width}x{height}: {len(EXPECTED)} saved Published items, states, three views, overflow, screenshots')
            await ctx.close()

        ctx=await browser.new_context(**p.devices['iPhone 13'])
        page=await ctx.new_page()
        page.on('pageerror',lambda e:report['errors'].append(str(e)))
        await page.goto(URL+'#itinerary');await page.wait_for_selector('.card')
        await page.evaluate(HOOK)
        await frames(page)
        await page.tap('[data-view=itinerary]');await visible(page,'itinerary')
        await page.wait_for_timeout(450)
        await page.locator('details').first.tap()
        await page.evaluate('window.scrollTo(0,950)');await page.wait_for_timeout(100)
        saved=await page.evaluate('scrollY')
        await page.tap('[data-view=budget]');await visible(page,'budget')
        await page.wait_for_timeout(350)
        await page.screenshot(path=str(OUT/'unfrozen-scrolled-budget.png'))
        await page.go_back();await visible(page,'itinerary');await page.wait_for_timeout(400)
        restored=await page.evaluate('scrollY')
        report['scroll']={'saved':saved,'restored':restored}
        if abs(saved-restored)>2: report['failures'].append('history scroll restoration')
        await page.go_forward();await visible(page,'budget')
        for view in ['notes','itinerary','budget','notes','budget','itinerary']*3:
            await page.tap('[data-view='+view+']',timeout=3000)
        await visible(page,'itinerary');await page.wait_for_timeout(400)
        report['checks'].append('18 rapid real taps, back/forward, scroll restoration, frozen and unfrozen transitions')
        await page.set_viewport_size({'width':844,'height':390});await visible(page,'itinerary')
        await page.set_viewport_size({'width':390,'height':844})
        await page.tap('[data-view=notes]');await visible(page,'notes');await page.wait_for_timeout(400)
        await page.locator('#motion').focus()
        assert await page.locator('#motion').evaluate('(e)=>e===document.activeElement')
        await page.keyboard.press('Enter')
        assert await page.locator('html').get_attribute('data-motion')=='off'
        await ctx.close()

        ctx=await browser.new_context(**p.devices['iPhone 13'],reduced_motion='reduce')
        page=await ctx.new_page();await page.goto(URL);await page.wait_for_selector('.card')
        await page.evaluate(HOOK)
        for view in ['budget','notes','itinerary']:
            await page.tap('[data-view='+view+']');await visible(page,view)
        assert await page.evaluate('__starts')==0
        assert await page.evaluate('document.getAnimations().length')==0
        report['checks'].append('OS reduced motion: zero view transitions or animations; motion button keyboard activation')
        await ctx.close();await browser.close()
    (OUT/'report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
    assert not report['failures'] and not report['errors']

asyncio.run(main())
