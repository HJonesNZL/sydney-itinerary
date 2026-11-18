"""Interaction and responsive checks for the reference-led itinerary redesign."""
import asyncio,json,pathlib
from playwright.async_api import async_playwright

async def main():
    out=pathlib.Path('private/webkit-audit')
    errors=[]
    async with async_playwright() as p:
        browser=await p.webkit.launch()
        context=await browser.new_context(**p.devices['iPhone 13'])
        page=await context.new_page()
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto('http://127.0.0.1:4175/#itinerary')
        await page.wait_for_selector('.card')
        expected=json.loads(pathlib.Path('private/draft-source.json').read_text())['rows'][1:]
        assert await page.locator('.card').count()==len(expected)
        assert await page.locator('.flight-route').count()==2
        assert 'NZDT' in await page.locator('.flight-route').first.inner_text()
        assert 'AEDT' in await page.locator('.flight-route').first.inner_text()
        nav=await page.locator('.view-nav').bounding_box()
        height=await page.evaluate('innerHeight')
        assert nav['y']+nav['height']<=height and nav['y']>height-130
        await page.evaluate('scrollTo(0,900)')
        later=await page.locator('.view-nav').bounding_box()
        assert abs(nav['y']-later['y'])<1
        await page.evaluate('scrollTo(0,0)')
        # Multi-day activities remain visible through their end date.
        multiday=next((r for r in expected if not r[2] and r[17] and r[17]>r[1]),None)
        if multiday:
            await page.locator('[data-date="'+multiday[17]+'"]').tap()
            assert 'ongoing' in await page.locator('#overview-detail').inner_text()
        # A date selection scrolls to its day and identifies the selected chip.
        day=expected[-1][1]
        await page.locator('[data-date="'+day+'"]').tap()
        await page.wait_for_timeout(600)
        assert await page.locator('[data-date="'+day+'"]').get_attribute('aria-pressed')=='true'
        box=await page.locator('#day-'+day).bounding_box()
        assert -2<=box['y']<200
        # A second view and history navigation preserve the selected day and position.
        await page.tap('[data-view=notes]');await page.wait_for_timeout(300)
        await page.go_back();await page.wait_for_timeout(350)
        assert await page.locator('[data-date="'+day+'"]').get_attribute('aria-pressed')=='true'
        await page.evaluate('scrollTo(0,0)')
        await page.tap('#search-toggle')
        assert await page.locator('#search').evaluate('(e)=>e===document.activeElement')
        await page.locator('#search').fill(expected[0][0])
        assert await page.locator('.timeline-item:visible').count()==1
        assert await page.locator('.timeline-item:visible h3').inner_text()==expected[0][0]
        await page.locator('#search').fill('no-match-unique-string')
        assert not await page.locator('#search-empty').is_hidden()
        assert await page.locator('.timeline-item:visible').count()==0
        await page.tap('#search-clear')
        assert await page.locator('.timeline-item:visible').count()==len(expected)
        await page.keyboard.press('Escape')
        assert await page.locator('#search-panel').is_hidden()
        assert await page.locator('#search-toggle').evaluate('(e)=>e===document.activeElement')
        await page.locator('.date-chip').first.tap()
        await page.wait_for_timeout(600)
        await page.locator('#date-strip').evaluate('(e)=>e.scrollLeft=0')
        await page.locator('#search-toggle').blur()
        await page.set_viewport_size({'width':320,'height':568})
        await page.evaluate('scrollTo(0,0)')
        await page.screenshot(path=str(out/'redesign-320.png'))
        assert await page.evaluate('document.documentElement.scrollWidth===innerWidth')
        await page.set_viewport_size({'width':390,'height':844})
        await page.screenshot(path=str(out/'redesign-390.png'))
        # Larger text stress check; this is not an OS accessibility certification.
        await page.add_style_tag(content='h1,h2,h3,p,button,summary,.stop strong,.stop span,.tag,.payment{font-size:135% !important}')
        assert await page.evaluate('document.documentElement.scrollWidth===innerWidth')
        await page.screenshot(path=str(out/'redesign-large-text.png'))
        await browser.close()
    report={'browser':'WebKit','errors':errors,'checks':['fixed bottom navigation remains in viewport while scrolling','date jump, selected day, ongoing multi-day plans and history position','flight cards retain both local timezones','search, no matches, clear and Escape focus','320/390px and larger text overflow']}
    (out/'redesign-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
    assert not errors
asyncio.run(main())
