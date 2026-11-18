"""Render the generic SVG app icon using the project's existing WebKit runtime."""
import asyncio,pathlib
from playwright.async_api import async_playwright

async def main():
    root=pathlib.Path(__file__).resolve().parent.parent
    svg=(root/'web/icon.svg').read_text()
    async with async_playwright() as p:
        browser=await p.webkit.launch()
        for size in [180,192,512]:
            page=await browser.new_page(viewport={'width':size,'height':size},device_scale_factor=1)
            await page.set_content('<style>html,body{margin:0}svg{display:block;width:100vw;height:100vh}</style>'+svg)
            await page.screenshot(path=str(root/f'web/icon-{size}.png'))
            await page.close()
        await browser.close()
asyncio.run(main())
