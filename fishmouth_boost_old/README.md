# Fish Mouth Boost – Production Readiness & Feature Pack (Full)

This package adds **docs**, **PRDs**, **skeleton code**, **SQL migrations**, **frontend stubs**,
**runbooks**, and a **Postman collection** to accelerate implementation of the Fish Mouth app.

Created: 2025-10-14

## How to use
1. **Unzip** into your repository root (or a staging branch).
2. **Apply** SQL migrations in `/boost/migrations` using Alembic or psql.
3. **Mount** the routers from `/boost/backend/app/api/v1` into your FastAPI app.
4. **Integrate** the library helpers from `/boost/backend/lib` and services under `/boost/backend/services`.
5. **Add** the React stubs from `/boost/frontend/src` into your frontend and wire routes.
6. **Follow** the PRDs in `/docs/prd` and use `/docs/CODEX_INSTRUCTIONS.md` with CodeX Pro.
7. **Run** the Postman collection in `/boost/postman` to verify end-to-end flows.

## Folder Overview
- `docs/prd/` – All PRDs (PRD-00 ... PRD-16) covering features and infra.
- `boost/backend/` – Backend helpers, services, and API endpoints stubs.
- `boost/frontend/` – Dashboard, Leads, Call Log, Scanner, App Config stubs.
- `boost/migrations/` – SQL migration drafts to create necessary tables/columns.
- `boost/postman/` – Postman collection for basic smoke tests.
- `boost/config/` – .env example and compose overrides.
- `docs/ops/` – Runbooks and example Grafana dashboard JSON.
- `docs/CODEX_INSTRUCTIONS.md` – One script to instruct CodeX Pro.

## Note
These are **scaffolds** meant to integrate with your existing app. Areas marked `TODO` or
"placeholder" should be replaced with your real implementations.
