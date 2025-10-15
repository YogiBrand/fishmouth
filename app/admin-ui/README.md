# Fishmouth Admin UI

A Vite + React control surface that mirrors the marketing app's polish while exposing end-to-end telemetry, billing, messaging, and queue operations for the Fishmouth platform.

## Getting Started

| Command | Description |
| --- | --- |
| `npm install` | Install dependencies (lucide-react, recharts, React Router). |
| `npm run dev` | Launch Vite dev server on port 5173. Point `VITE_ADMIN_API` to the admin FastAPI service (default `http://localhost:8031`). |
| `npm run build` | Generate production assets. |
| `npm run preview` | Preview the production build on port 3031. |

Create a `.env` file or export `VITE_ADMIN_API` so the UI knows where to fetch analytics:

```bash
# example
VITE_ADMIN_API=http://localhost:8031
```

When running via `docker-compose` inside `app/`, the admin stack (Postgres, Redis, telemetry gateway, admin API, billing gateway) exposes the API on `http://localhost:8031` and wires telemetry through `http://telemetry_gw_8030:8030`.

## Design System

- Theme tokens live in `src/ui/theme/tokens.css` and are applied via the `ThemeProvider` (`src/ui/theme/ThemeProvider.jsx`).
- Shared primitives (buttons, cards, tables, badges, toast system, charts) reside in `src/ui/components/`.
- Layout shell (`LayoutShell.jsx`) supplies the top bar + navigation, while pages live in `src/ui/pages/`.
- Charts use Recharts with consistent brand colours; tables standardise interactions (row click, hover, empty states).

## Key Pages

- **Overview:** Aggregates KPIs, usage, costs, and service health.
- **Messaging:** Manage providers, run deliverability tests, verify DNS, and push Cloudflare changes.
- **Jobs & Queues:** Inspect orchestrator workloads, queue health, and job payloads.
- **Users:** Search accounts, adjust credits, review billing ledger, and inspect per-user telemetry.
- **Usage / Costs / Health:** Deep dives powered by new `/usage/summary`, `/costs/summary`, and `/health/services` endpoints.

## Testing & QA

- `npm run build` ensures the code compiles; run it before committing.
- Pages embed loading and error states—validate flows by killing services (Redis, orchestrator, etc.) and confirming UI copies remain helpful.
- For full stack validation, start `docker-compose` in `app/` and ensure Postgres migrations (`app/sql`) are applied so analytics views exist.
