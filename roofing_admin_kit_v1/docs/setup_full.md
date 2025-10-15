# Full Setup (Admin + Observability + GeoCompute)

1. **Environment**
   - Add to your `.env`:
     ```
     ADMIN_JWT_SECRET=change-this
     OPENROUTER_API_KEY=sk-or-...
     TWILIO_ACCOUNT_SID=...
     TWILIO_AUTH_TOKEN=...
     # Postgres
     DATABASE_URL=postgresql://user:pass@postgres:5432/app
     ANALYTICS_URL=postgresql://user:pass@postgres:5432/app
     REDIS_URL=redis://redis:6379/0
     ```
2. **Compose**
   - Layer these over your main compose:
     - `config/docker-compose.additions.yml` (from v2)
     - `observability/docker-compose.observability.yml` (this kit)
3. **Migrations**
   - Apply SQL in `sql/migrations/*.sql` (creates `analytics` schema with tables & views).
4. **Bring up**
   ```bash
   docker compose -f docker-compose.yml \
     -f config/docker-compose.additions.yml \
     -f config/docker-compose.tiles.yml \
     -f observability/docker-compose.observability.yml up -d
   ```
5. **Grafana**
   - Open `http://localhost:3001`, import dashboards from `observability/grafana/dashboards/*.json`.
6. **Admin UI**
   - `cd admin-ui && npm i && npm run dev` (dev) or `npm run build && npm run preview`.
7. **Wire telemetry**
   - Add the middleware snippet from `telemetry-gw/README.md` to each FastAPI service.
