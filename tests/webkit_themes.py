"""Both colour palettes, reload persistence, keyboard and blocked-storage checks."""
import asyncio,json,pathlib
from playwright.async_api import async_playwright

async def main():
    out=pathlib.Path('private/webkit-audit/themes');out.mkdir(parents=True,exist_ok=True)
    errors=[];checks=[]
    async with async_playwright() as p:
        browser=await p.webkit.launch()
        for width,height in [(320,568),(360,780),(375,812),(390,844),(430,932),(844,390)]:
            c=await browser.new_context(**{**p.devices['iPhone 13'],'viewport':{'width':width,'height':height}})
            page=await c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            await page.goto('http://127.0.0.1:4175/#itinerary');await page.wait_for_selector('.card')
            titles=await page.locator('.card h3').all_text_contents()
            assert await page.locator('html').get_attribute('data-theme')=='blush'
            await page.tap('#theme-toggle')
            assert await page.locator('html').get_attribute('data-theme')=='cobalt'
            assert await page.locator('#theme-toggle').get_attribute('aria-pressed')=='true'
            assert await page.locator('#theme-name').inner_text()=='Cobalt'
            for view in ['itinerary','budget','notes']:
                await page.tap('[data-view='+view+']');await page.wait_for_timeout(350)
                assert await page.evaluate('document.documentElement.scrollWidth===innerWidth')
                await page.screenshot(path=str(out/f'cobalt-{width}-{height}-{view}.png'),full_page=True)
                if width==390 and view=='itinerary':await page.screenshot(path=str(out/'cobalt-390-viewport.png'))
            assert await page.locator('.card h3').all_text_contents()==titles
            await page.reload();await page.wait_for_selector('#notes-view:visible')
            assert await page.locator('html').get_attribute('data-theme')=='cobalt'
            assert await page.locator('meta[name="theme-color"]').get_attribute('content')=='#efe5d8'
            await page.locator('#theme-toggle').focus();await page.keyboard.press('Enter')
            assert await page.locator('html').get_attribute('data-theme')=='blush'
            assert await page.locator('#theme-toggle').get_attribute('aria-pressed')=='false'
            await page.reload();await page.wait_for_selector('#notes-view:visible')
            assert await page.locator('html').get_attribute('data-theme')=='blush'
            assert await page.evaluate('Object.keys(localStorage)')==['itinerary-colour-theme']
            checks.append(f'{width}x{height}: cobalt in all views, unchanged plans, keyboard toggle and reload persistence')
            await c.close()
        c=await browser.new_context(**p.devices['iPhone 13'],reduced_motion='reduce')
        await c.add_init_script("Storage.prototype.getItem=()=>{throw new DOMException('Blocked','SecurityError')};Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError')}")
        page=await c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto('http://127.0.0.1:4175/');await page.wait_for_selector('.card')
        await page.tap('#theme-toggle')
        assert await page.locator('html').get_attribute('data-theme')=='cobalt'
        assert await page.evaluate('document.getAnimations().length')==0
        await page.reload();await page.wait_for_selector('.card')
        assert await page.locator('html').get_attribute('data-theme')=='blush'
        checks.append('blocked storage falls back safely; reduced-motion theme switch has no animation')
        await browser.close()
    report={'browser':'WebKit','errors':errors,'checks':checks}
    (out/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
    assert not errors
asyncio.run(main())
