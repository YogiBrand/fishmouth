# CODEX: Update the marketing site to Jitter-style interactions

## Goal
Integrate a polished homepage with a **horizontal gallery**, **scroll-driven demo stepper**, and **feature grid** using GSAP. Personalize copy by city/region and adopt the new darker blue brand tokens.

## Steps
1) Copy the contents of `/frontend/src/marketing/**` into the frontend.
2) Ensure static `/frontend/public/assets/demo/**` is served.
3) Wire routing so `/` renders `marketing/Home.jsx`.
4) Install frontend deps:
   ```bash
   npm i gsap lottie-react
   ```
5) Register the **geo endpoint** in FastAPI:
   ```py
   from backend.app.api.v1.geo import router as geo_router
   app.include_router(geo_router)
   ```
6) Confirm end-to-end:
   - Open `/` → hero renders with localized city if headers present.
   - Scroll into **gallery** → cards slide horizontally, overlay shows feature info.
   - Continue to **demo stepper** → progress bar fills as you scroll; Next/Prev buttons work.
   - Feature grid reveals on scroll.
7) Replace placeholder SVGs with real dashboard screenshots and Lottie files when available.

## Acceptance
- No console errors or layout shifts (CLS < 0.05).
- Gallery pins during scroll and remains above 55 FPS on mid-tier laptops.
- Stepper follows scroll position and is keyboard accessible (Tab to buttons).
- Colors align with brand tokens; text contrast ≥ 4.5:1 for body, 3:1 for large headings.
