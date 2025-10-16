from typing import Dict
import os, httpx

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY","")
MODEL = os.getenv("RESEARCH_MODEL","perplexity/sonar-deep-research")

async def query_openrouter(question: str) -> Dict:
    if not OPENROUTER_API_KEY:
        return {"error":"OPENROUTER_API_KEY missing"}
    h = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "FishMouthResearchAgent"
    }
    payload = {"model": MODEL, "messages": [{"role":"user","content":question}]}
    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post("https://openrouter.ai/api/v1/chat/completions", headers=h, json=payload)
        r.raise_for_status()
        data = r.json()
        content = data.get("choices",[{}])[0].get("message",{}).get("content","")
        return {"answer": content, "raw": data}

async def query_playwright(question: str) -> Dict:
    try:
        from playwright.async_api import async_playwright
    except Exception:
        return {"error":"playwright not installed. Run: pip install playwright && playwright install chromium"}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page()
        await page.goto("https://www.perplexity.ai/")
        await page.fill("textarea", question)
        await page.keyboard.press("Enter")
        await page.wait_for_selector("article", timeout=120000)
        html = await page.inner_text("article")
        await browser.close()
        return {"answer": html}
