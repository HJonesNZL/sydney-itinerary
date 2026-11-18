"""Second WebKit revision pass: disclosure, focus, scrolled frames, interrupted resize."""
import asyncio,json,pathlib
from playwright.async_api import async_playwright

async def main():
    out=pathlib.Path('private/webkit-audit')
    async with async_playwright() as p:
        b=await p.webkit.launch()
        c=await b.new_context(**p.devices['iPhone 13'])
        page=await c.new_page();errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto('http://127.0.0.1:4175/#itinerary');await page.wait_for_selector('.card')
        await page.locator('summary').first.tap()
        await page.locator('summary').nth(1).tap()
        assert await page.locator('details[open]').count()==2
        await page.set_viewport_size({'width':320,'height':568})
        await page.locator('summary').nth(1).scroll_into_view_if_needed()
        await page.wait_for_timeout(220)
        await page.screenshot(path=str(out/'320-open-details.png'))
        assert await page.evaluate('document.documentElement.scrollWidth===innerWidth')
        # History navigation must rescue focus when its old screen becomes hidden.
        await page.tap('[data-view=notes]');await page.wait_for_timeout(350)
        await page.locator('#motion').focus()
        await page.go_back();await page.wait_for_timeout(350)
        assert await page.evaluate('document.activeElement.id')=='plan-title'
        # Old scrolled content and new shorter view must not smear over the fixed chrome.
        await page.evaluate("(() => {window.__t=null;const o=document.startViewTransition.bind(document);document.startViewTransition=cb=>(window.__t=o(cb));})()")
        await page.evaluate('window.scrollTo(0,1400)')
        await page.wait_for_timeout(100)
        box=await page.locator('[data-view=budget]').bounding_box()
        await page.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']/2)
        assert await page.evaluate('window.__t===null')
        await page.evaluate('document.getAnimations().filter(a=>isFinite(a.effect.getComputedTiming().endTime)).forEach(a=>{a.pause();a.currentTime=150})')
        await page.screenshot(path=str(out/'scrolled-transition-150.png'))
        await page.evaluate('document.getAnimations().filter(a=>isFinite(a.effect.getComputedTiming().endTime)).forEach(a=>a.finish())')
        # Resize while the next live entrance is still in progress.
        await page.tap('[data-view=notes]')
        assert await page.locator('#screen').evaluate('(e)=>e.getAnimations().length>0')
        await page.set_viewport_size({'width':844,'height':390})
        await page.wait_for_timeout(400)
        assert not await page.locator('#notes-view').is_hidden()
        assert await page.evaluate('document.documentElement.scrollWidth===innerWidth')
        await page.screenshot(path=str(out/'interrupted-landscape.png'))
        links=await page.locator('.card a').evaluate_all('(es)=>es.map(e=>({https:e.protocol==="https:",rel:e.rel}))')
        assert all(e['https'] and 'noopener' in e['rel'] for e in links)
        report={'browser':b.version,'errors':errors,'checks':['expanded long notes at 320px without overflow','focus rescued to new heading on history navigation','scroll restoration uses live entrance, frozen at 150ms, no misplaced snapshot','landscape resize interrupts live navigation safely','booking links HTTPS and noopener']}
        (out/'details-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
        await b.close()
        assert not errors
asyncio.run(main())
