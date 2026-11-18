"""Local publication fixture: details/weather/refresh and cold offline without a server."""
import asyncio,json,pathlib,tempfile,subprocess,shutil
from playwright.async_api import async_playwright
ROOT=pathlib.Path.cwd();OUT=ROOT/'private/webkit-audit/snapshot';OUT.mkdir(parents=True,exist_ok=True)
def rows(title='Example shopping',high=26):
    note='[itinerary-details:v1]\n'+json.dumps({'summary':'Flexible stops','stops':[{'name':'Example shop','address':'Example street','url':'https://maps.apple.com/place?place-id=I123'},{'name':'Example group','children':[{'name':'Example branch','address':'Another street','url':'https://maps.apple.com/place?address=Example'}]}]})+'\n[/itinerary-details]\n[itinerary-weather:v1]\n'+json.dumps({'timeZone':'Australia/Sydney','fetchedAt':'2030-01-01T00:00:00Z','days':{'2030-01-01':{'location':'sydney','high':high,'low':18,'code':2}}})+'\n[/itinerary-weather]'
    return [[],[title,'2030-01-01','','','','Sydney','','',note,'','','','','','example','Australia/Sydney','','','',False]]
async def ready():
    for _ in range(40):
        try:
            reader,writer=await asyncio.open_connection('127.0.0.1',4187);writer.close();await writer.wait_closed();return
        except OSError:await asyncio.sleep(.1)
    raise RuntimeError('Fixture server not ready')
async def main():
    errors=[];checks=[];api_calls=[]
    with tempfile.TemporaryDirectory(dir=ROOT/'private') as directory:
        folder=pathlib.Path(directory);shutil.copytree(ROOT/'web',folder/'site');(folder/'site/api').mkdir()
        target=folder/'site/api/published'
        def publish(title='Example shopping',high=26):target.write_text(json.dumps({'rows':rows(title,high),'publishedAt':'2030-01-01T00:00:00Z'}))
        publish()
        def server():return subprocess.Popen(['python3','-m','http.server','4187','--bind','127.0.0.1','--directory',str(folder/'site')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        process=server();await ready()
        async with async_playwright() as p:
            profile=folder/'profile'
            async def context():return await p.webkit.launch_persistent_context(str(profile),**{k:v for k,v in p.devices['iPhone 13'].items() if k!='default_browser_type'})
            c=await context();page=c.pages[0];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda request:api_calls.append({'url':request.url,'method':request.method}) if '/api/' in request.url or 'sheets.googleapis.com' in request.url else None)
            try:
                await page.goto('http://127.0.0.1:4187');await page.click('#connect');await page.wait_for_selector('.card-title-button')
                await page.wait_for_function('navigator.serviceWorker.controller !== null')
                assert await page.locator('.weather-value').inner_text()=='26/18°C'
                for theme in ['blush','cobalt']:
                    if theme=='cobalt':await page.click('#theme-toggle')
                    for width in [320,390]:
                        await page.set_viewport_size({'width':width,'height':844})
                        await page.click('.card-title-button');await page.click('#item-more > summary')
                        assert await page.locator('#item-stops a').count()==2
                        assert await page.locator('#item-stops').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
                        await page.screenshot(path=str(OUT/(theme+'-'+str(width)+'.png')))
                        await page.go_back();assert not await page.locator('#item-dialog').is_visible()
                        await page.click('.card-title-button');await page.click('#item-dialog-close');await page.wait_for_function('!document.querySelector("#item-dialog").open')
                publish('Newer published shopping',29);await page.click('#refresh');await page.wait_for_function('document.querySelector(".weather-value").textContent==="29/18°C"')
                assert 'Newer' in await page.locator('.card h3').inner_text();checks.append('normal Refresh loads newer immutable snapshot')
                await page.wait_for_function('!document.querySelector("#refresh").disabled')
                # Only allowlisted shell responses, no data API, tokens or private snapshot in CacheStorage.
                keys=await page.evaluate('''async()=>{const result=[];for(const n of await caches.keys())for(const r of await (await caches.open(n)).keys())result.push(r.url);return result}''')
                assert not any('/api/' in x for x in keys)
                assert await page.evaluate('Object.keys(localStorage).every(k=>k==="itinerary-colour-theme")')
                print('closing online context',flush=True);await asyncio.wait_for(c.close(),15);process.terminate();process.wait();print('server stopped',flush=True)
                c=await context();page=c.pages[0];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda request:api_calls.append({'url':request.url,'method':request.method}) if '/api/' in request.url or 'sheets.googleapis.com' in request.url else None);print('cold context open',flush=True)
                await page.goto('http://127.0.0.1:4187');await page.wait_for_selector('.card-title-button')
                assert 'Newer' in await page.locator('.card h3').inner_text()
                print('cold data restored',await page.locator('#status').inner_text(),flush=True);await page.wait_for_function('document.querySelector("#status").textContent.includes("Offline")');await c.set_offline(True);print('offline interaction',flush=True)
                await page.click('[data-view=pets]');assert await page.locator('.pets-welcome').is_visible();await page.click('[data-view=itinerary]')
                await page.click('.card-title-button');await page.click('#item-more > summary');assert await page.locator('#item-stops a').count()==2
                await page.click('#item-dialog-close');await page.wait_for_function('!document.querySelector("#item-dialog").open')
                checks.append('cold WebKit reopen offline with origin server stopped retains details/weather')
                print('recovering',flush=True);process=server();publish('Recovered online shopping',30);await ready();await c.set_offline(False);await page.click('#refresh');await page.wait_for_function('document.querySelector(".weather-value").textContent==="30/18°C"')
                checks.append('online recovery replaces saved snapshot')
                await page.emulate_media(reduced_motion='reduce');await page.click('.card-title-button');assert await page.evaluate('document.getAnimations().length')==0;await page.keyboard.press('Escape');await page.wait_for_function('!document.querySelector("#item-dialog").open')
                await page.click('#signout');await page.wait_for_function('document.querySelector("#status").textContent.includes("cleared")');await page.reload();assert await page.locator('.card-title-button').count()==0
                checks.append('Clear saved survives reload without private fixture; OS reduced motion respected')
                assert not errors,errors
                assert api_calls and all(call['method']=='GET' and '/api/published' in call['url'] for call in api_calls),api_calls
                checks.append('Refresh/online recovery issue only GET published-snapshot requests, never Sheet writes or draft publication')
                (OUT/'report.json').write_text(json.dumps({'checks':checks,'errors':errors,'apiCalls':api_calls,'limits':'Synthetic publication fixture; WebKit emulation, not physical iPhone/Home Screen'},indent=2));print(json.dumps(checks))
            except Exception:
                (OUT/'failure.html').write_text(await page.content())
                (OUT/'failure.json').write_text(json.dumps({'errors':errors,'state':await page.evaluate('''async()=>({status:document.querySelector('#status')?.textContent,controller:!!navigator.serviceWorker.controller,registrations:(await navigator.serviceWorker.getRegistrations()).length,dbs:await indexedDB.databases(),caches:await Promise.all((await caches.keys()).map(async name=>({name,keys:(await (await caches.open(name)).keys()).map(r=>r.url)})))})''')},indent=2))
                raise
            finally:
                await c.close()
                if process.poll() is None:process.terminate();process.wait()
asyncio.run(main())
