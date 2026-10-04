import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:3000")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="final_app_verification.png", full_page=True)
        print("Screenshot saved to final_app_verification.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
