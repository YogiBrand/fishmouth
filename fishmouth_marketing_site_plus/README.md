# Fish Mouth Marketing Site Pack (Jitter-style interactions)

This pack gives you:
- **A polished marketing homepage** (`frontend/src/marketing/Home.jsx`) with a **horizontal gallery** and a **demo stepper** that mirrors the feel of [jitter.video]'s smooth scroll sections.
- **Brand tokens** (`brand_tokens.css`) for a darker blue theme that pairs with your dashboard but stays neutral on public pages.
- **GSAP wiring** (`utils/gsapSetup.ts`) and **scroll components** (`GalleryScroller.jsx`, `DemoDashboardStepper.jsx`, `FeatureSections.jsx`).
- **Geo personalization** via a simple backend stub (`backend/app/api/v1/geo.py`) and a front-end hook (`useGeo.ts`).
- **Local pains data** (`data/local_pains.json`) you can expand to speak to regional roof issues.
- **Placeholder assets** under `/frontend/public/assets/demo/`.

> Built 2025-10-15.

## How to integrate

1. **Copy files** into your repo:
   - Move `frontend/src/marketing/**` under your frontend source.
   - Serve `/frontend/public/assets/demo` as static.
   - Mount `backend/app/api/v1/geo.py` in your FastAPI app:  
     ```py
     from backend.app.api.v1 import geo as geo_router
     app.include_router(geo_router.router)
     ```

2. **Install deps** in frontend:
   ```bash
   npm i gsap lottie-react
   # optional smooth scrolling: npm i @studio-freight/lenis
   ```

3. **Route the homepage** to `Home.jsx`:
   - If you're using React Router, add a route for `/` to `marketing/Home`.
   - Or replace your current landing with this component.

4. **Replace placeholder images** with real dashboard screenshots or Lottie demos.
   - Export micro-interactions as Lottie (recommended).

5. **Brand tuning**:
   - Edit `brand_tokens.css` to adjust blues; keep contrast ratios ≥ 4.5:1.

6. **Performance**:
   - All animations are GPU-friendly (translate/opacity). The gallery uses ScrollTrigger to pin and update a CSS variable, following the approach described in the Jitter case study.

## Accessibility & Opt-outs

- Respect `prefers-reduced-motion`: wrap GSAP triggers in a check; provide a "Turn off animations" toggle by setting `document.documentElement.style.setProperty('--reduce-motion','1')` and guard transitions.

## References

- Jitter redesign used **React + GSAP**, a large **horizontal scroll**, **CSS variables for progress**, and **linear() spring-like easings**; Lottie for lightweight motion. This pack mirrors those techniques in a roofers-first context.
