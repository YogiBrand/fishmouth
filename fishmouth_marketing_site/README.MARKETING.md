# Fish Mouth Marketing Site Pack

This pack adds a **conversion-optimized marketing site** to your existing React + FastAPI app,
tailored to roofers and **personalized by location**. It includes pages, components, copy, data,
and backend endpoints to capture **“25 Free Leads”** signups and personalize content by city/state.

**What you get**

- **Frontend (React + Tailwind)** marketing pages under `marketing/`:
  - Home (personalized hero + pain-points + interactive demo wizard)
  - Features, Pricing, Testimonials, Case Studies, FAQ, Contact, Integrations
  - Legal pages (Privacy, Terms)
  - Re-usable components (Hero, Navbar, Footer, PainPoints, Objections, PricingTable, TestimonialCarousel, CaseStudyGrid, ScrollWizard, DemoDashboard)
  - Data files (regional pain-points, testimonials, case studies, objections, features)

- **Backend (FastAPI)** additions under `marketing/`:
  - `/api/v1/marketing/claim_free_leads` — capture signup (name, email, phone, company, geo, UTM); emits event `marketing.signup_claimed`
  - `/api/v1/geo/guess` — best-effort geo guess using headers; falls back to timezone mapping
  - SQL migration for `marketing_signups`

- **Postman** collection to test endpoints.

> Everything is additive; it **doesn’t replace** your dashboard. You can serve these routes on `/`
  while logged-out users see marketing, and authenticated users land on the app dashboard.

---

## Quick Install (10–15 minutes)

1) **Copy files** from this zip into your repo. Recommended structure:

```
/frontend/src/pages/marketing/...
/frontend/src/components/marketing/...
/frontend/src/data/marketing/...
/frontend/src/lib/marketing/...
/public/marketing/...

/backend/app/api/v1/marketing.py        # NEW
/backend/app/api/v1/geo_guess.py        # NEW
/migrations/sql/20251015_add_marketing_signups.sql   # NEW SQL (or convert to Alembic)
```

2) **Backend**
   - Mount new routers in `backend/main.py` (or your FastAPI entrypoint):
     ```python
     from backend.app.api.v1 import marketing as marketing_router
     from backend.app.api.v1 import geo_guess as geo_guess_router
     app.include_router(marketing_router.router)
     app.include_router(geo_guess_router.router)
     ```
   - Apply the SQL migration for `marketing_signups` (or create an Alembic migration using the SQL provided).

3) **Frontend routes**
   - Add marketing routes to your React Router (e.g. in `src/App.jsx` or `src/routes.js`):
     ```jsx
     import Home from './pages/marketing/Home';
     import Pricing from './pages/marketing/Pricing';
     import Features from './pages/marketing/Features';
     import TestimonialsPage from './pages/marketing/Testimonials';
     import CaseStudies from './pages/marketing/CaseStudies';
     import FAQ from './pages/marketing/FAQ';
     import Contact from './pages/marketing/Contact';
     import Integrations from './pages/marketing/Integrations';
     import Terms from './pages/marketing/Legal/Terms';
     import Privacy from './pages/marketing/Legal/Privacy';
     import Demo from './pages/marketing/Demo';

     // example with react-router v6
     <Routes>
       <Route path="/" element={<Home />} />
       <Route path="/pricing" element={<Pricing />} />
       <Route path="/features" element={<Features />} />
       <Route path="/testimonials" element={<TestimonialsPage />} />
       <Route path="/case-studies" element={<CaseStudies />} />
       <Route path="/faq" element={<FAQ />} />
       <Route path="/contact" element={<Contact />} />
       <Route path="/integrations" element={<Integrations />} />
       <Route path="/terms" element={<Terms />} />
       <Route path="/privacy" element={<Privacy />} />
       <Route path="/demo" element={<Demo />} />
     </Routes>
     ```

4) **Personalization (optional but recommended)**
   - Configure your proxy (e.g., Nginx/Cloudflare) to pass geo headers:
     `X-Geo-City`, `X-Geo-Region`, `CF-IPCountry`.
   - Alternatively, set a global variable in your index.html:
     ```html
     <script>window.__FM_GEO__ = {city: "Austin", state: "TX", country: "US", source: "server"}</script>
     ```
   - The frontend will also read `?city=...&state=...` if present, and otherwise fall back to timezone heuristics.

5) **Environment** (backend)
   - Ensure `JWT_SECRET` and DB are set, and that your app can write events (if using `emit_event()` from your codebase).
   - No external API keys are required for these endpoints.

6) **Smoke test**
   - Start backend + frontend.
   - Open `http://localhost:3000/` → personalized hero “Roof leads in {CITY}…”
   - Submit the “Get 25 Free Leads” form → 200 from `/api/v1/marketing/claim_free_leads`.

---

## Personalization logic (in `/src/lib/marketing/geo.js`)

Priority:
1) `window.__FM_GEO__` (server-injected) or `/api/v1/geo/guess`
2) URL `?city=&state=`
3) Browser timezone → rough state fallback
4) Default: `"United States"`

Pain points are resolved in this order:
`city` → `state` → national defaults (see `data/marketing/pain_points.json`).

---

## Demo Dashboard on Home

The `DemoDashboard` component fetches your real endpoints if available:
- `/api/v1/app-config`
- `/api/v1/dashboard/summary`

If unavailable, it falls back to realistic sample data. So you can showcase your real product within the homepage.

---

## Legal

- Testimonials and logos in this pack are **placeholders** to help you design and test the page. Replace with real customers before going live.
- Do not imply endorsements until you have permission.
