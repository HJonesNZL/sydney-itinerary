"""Observe motion over real frames and verify that new input interrupts it."""
import asyncio,json,pathlib
from playwright.async_api import async_playwright

async def main():
    out=pathlib.Path('private/webkit-audit/motion');out.mkdir(parents=True,exist_ok=True)
    errors=[];checks=[]
    async with async_playwright() as p:
        browser=await p.webkit.launch()
        for theme in ['blush','cobalt']:
            c=await browser.new_context(**p.devices['iPhone 13'])
            page=await c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            await page.goto('http://127.0.0.1:4175/#itinerary');await page.wait_for_selector('.card')
            if theme=='cobalt':await page.tap('#theme-toggle')
            day=await page.locator('.day').nth(3).get_attribute('id')
            selector='[data-date="'+day[4:]+'"]'
            await page.evaluate('scrollTo(0,0)')
            await page.evaluate('''id=>{window.__trace=[];window.__traceOn=true;window.__clickAt=0;
                document.addEventListener('click',()=>window.__clickAt=performance.now(),{once:true});
                const record=t=>{if(window.__clickAt)window.__trace.push({t:t-window.__clickAt,y:scrollY,transform:getComputedStyle(document.getElementById(id)).transform});if(window.__traceOn)requestAnimationFrame(record)};requestAnimationFrame(record)}''',day)
            await page.locator(selector).tap()
            await page.wait_for_timeout(900)
            trace=await page.evaluate('window.__traceOn=false;window.__trace')
            final=await page.evaluate('scrollY')
            values=[r['y'] for r in trace]
            (out/(theme+'-day-trace.json')).write_text(json.dumps({'hidden':await page.evaluate('document.hidden'),'motion':await page.locator('html').get_attribute('data-motion'),'final':final,'trace':trace},indent=2))
            assert final>300
            assert len(set(values))>12
            assert max(values)<=final+12
            changed=[r for r in trace if abs(r['y']-final)>1]
            assert changed and 200<changed[-1]['t']<800
            assert any(r['transform']!='none' for r in trace)
            assert await page.locator('#'+day+' .day-label').evaluate('(e)=>document.activeElement===e')
            await page.screenshot(path=str(out/(theme+'-landed.png')))
            # A view change must cancel the journey and its future focus transfer.
            await page.evaluate('scrollTo(0,0)')
            await page.locator(selector).tap();await page.wait_for_timeout(100)
            await page.tap('[data-view=notes]');await page.wait_for_timeout(800)
            assert not await page.locator('#notes-view').is_hidden()
            assert await page.evaluate('scrollY')==0
            assert not await page.evaluate("document.activeElement.closest('#itinerary-view')!==null")
            # A touch interrupt is respected immediately, without a late snap back.
            await page.tap('[data-view=itinerary]');await page.wait_for_timeout(350)
            await page.evaluate('scrollTo(0,0)')
            await page.locator(selector).tap();await page.wait_for_timeout(120)
            await page.touchscreen.tap(5,200);await page.evaluate('scrollBy(0,70)');await page.wait_for_timeout(180)
            interrupted=await page.evaluate('scrollY');await page.wait_for_timeout(600)
            assert abs(await page.evaluate('scrollY')-interrupted)<2
            # Holding a button responds before release; cancelling leaves no stuck scale.
            await page.evaluate('scrollTo(0,0)')
            box=await page.locator('#theme-toggle').bounding_box()
            await page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
            await page.mouse.down();await page.wait_for_timeout(100)
            held=await page.locator('#theme-toggle').evaluate('(e)=>getComputedStyle(e).transform')
            assert held!='none'
            await page.mouse.up();await page.wait_for_timeout(320)
            assert await page.locator('#theme-toggle').evaluate('(e)=>getComputedStyle(e).transform')=='none'
            checks.append(theme+': multi-frame eased travel, bounded landing bounce, final focus, view/manual interruption, press-down/release feedback')
            await c.close()
        c=await browser.new_context(viewport={'width':390,'height':844})
        page=await c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto('http://127.0.0.1:4175/');await page.wait_for_selector('.card')
        date=(await page.locator('.day').nth(3).get_attribute('id'))[4:]
        await page.locator('[data-date="'+date+'"]').click();await page.wait_for_timeout(120)
        await page.mouse.wheel(0,70);await page.wait_for_timeout(180)
        interrupted=await page.evaluate('scrollY');await page.wait_for_timeout(600)
        assert abs(await page.evaluate('scrollY')-interrupted)<2
        checks.append('desktop wheel cancels scrolling without a late snap back')
        await c.close()
        c=await browser.new_context(**p.devices['iPhone 13'],reduced_motion='reduce')
        page=await c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto('http://127.0.0.1:4175/');await page.wait_for_selector('.card')
        date=(await page.locator('.day').nth(3).get_attribute('id'))[4:]
        await page.locator('[data-date="'+date+'"]').tap()
        first=await page.evaluate('scrollY');await page.wait_for_timeout(250)
        assert first==await page.evaluate('scrollY')
        assert await page.evaluate('document.getAnimations().length')==0
        checks.append('OS reduced motion: instant day jump with no bounce or lingering animation')
        await browser.close()
    report={'errors':errors,'checks':checks}
    (out/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
    assert not errors
asyncio.run(main())
