"""Validate the locally built static public package under its GitHub Pages subpath."""
import asyncio,json,pathlib,tempfile,shutil,subprocess,re
from playwright.async_api import async_playwright
ROOT=pathlib.Path.cwd();OUT=ROOT/'private/webkit-audit/public';OUT.mkdir(parents=True,exist_ok=True)
async def main():
    package=ROOT/'private/public-site';data=json.loads((package/'published.json').read_text());expected=[r for r in data['rows'][1:] if r[0]]
    groups=[]
    for r in expected:
        block=re.search(r'\[itinerary-details:v1\]([\s\S]*?)\[/itinerary-details\]',r[8] or '')
        if block:groups.append((r[0],json.loads(block.group(1))))
    expected_links=sum(sum(len(s.get('children',[])) or 1 for s in d['stops']) for _,d in groups)
    errors=[];checks=[]
    with tempfile.TemporaryDirectory(dir=ROOT/'private') as folder:
        shutil.copytree(package,pathlib.Path(folder)/'sydney-itinerary')
        server=subprocess.Popen(['python3','-m','http.server','4188','--bind','127.0.0.1','--directory',folder],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            async with async_playwright() as p:
                browser=await p.webkit.launch()
                for theme in ['blush','cobalt']:
                    for width in [320,390,1100]:
                        c=await browser.new_context(viewport={'width':width,'height':844});page=await c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
                        await page.goto('http://127.0.0.1:4188/sydney-itinerary/');await page.wait_for_function('document.querySelector("#status").textContent.startsWith("Published snapshot")')
                        assert await page.locator('.card').count()==len(expected)
                        assert await page.locator('#connect').is_hidden()
                        if theme=='cobalt':await page.click('#theme-toggle')
                        for view in ['itinerary','budget','notes','pets']:
                            await page.click('[data-view='+view+']');await page.wait_for_timeout(260)
                            assert await page.locator('#'+view+'-view').is_visible()
                            assert await page.locator('[data-view='+view+']').get_attribute('aria-current')=='page'
                            assert await page.locator('.connection-footer').evaluate('(e)=>e.getBoundingClientRect().top>=document.querySelector("#screen").getBoundingClientRect().bottom-1')
                            assert await page.locator('body').evaluate('(e)=>e.scrollWidth<=innerWidth')
                        assert await page.locator('.pets-welcome').is_visible()
                        assert await page.locator('#pet-gallery').is_hidden()
                        assert await page.locator('.view-nav button').count()==4
                        await page.screenshot(path=str(OUT/(theme+'-'+str(width)+'-pets.png')))
                        await page.go_back();assert await page.locator('#notes-view').is_visible()
                        await page.go_forward();assert await page.locator('#pets-view').is_visible()
                        await page.reload();await page.wait_for_function('document.querySelector("#status").textContent.startsWith("Published snapshot")');assert await page.locator('#pets-view').is_visible()
                        await page.click('[data-view=itinerary]')
                        count=0
                        for title,details in groups:
                            await page.get_by_role('button',name=title,exact=True).click();await page.locator('#item-more > summary').click()
                            links=await page.locator('#item-stops .stop-link').evaluate_all('(nodes)=>nodes.map(a=>a.href)')
                            assert len(links)==sum(len(s.get('children',[])) or 1 for s in details['stops'])
                            assert all(url.startswith('https://maps.apple.com/') for url in links);count+=len(links)
                            assert await page.locator('#item-dialog').evaluate('(e)=>e.getBoundingClientRect().right<=innerWidth')
                            assert await page.locator('.planning-notes').count()==1
                            await page.locator('#item-dialog-close').click();await page.wait_for_function('!document.querySelector("#item-dialog").open')
                        assert count==expected_links
                        await page.locator('.connection-footer').scroll_into_view_if_needed();await page.screenshot(path=str(OUT/(theme+'-'+str(width)+'-footer.png')))
                        assert await page.locator('#status').evaluate('(e)=>e.getBoundingClientRect().bottom<document.querySelector(".view-nav").getBoundingClientRect().top')
                        checks.append(f'{theme}/{width}: {len(expected)} plans, {count} Maps links, full notes, Pets direct route/history/reload, four-button nav, footer below all views, no overflow')
                        await c.close()
                await browser.close()
            assert not errors,errors
            (OUT/'report.json').write_text(json.dumps({'checks':checks,'errors':errors,'limit':'Local static package, not deployed URL or physical iPhone'},indent=2));print(json.dumps(checks))
        finally:server.terminate();server.wait()
asyncio.run(main())
