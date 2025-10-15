# Codex Playbook — Single Agent (sequential)

**Objective:** Apply all minimal diffs safely, wire new services, and run E2E smoke tests.

## Steps
1. Read `docs/overview.md`, `docs/architecture_map.md`, `docs/workflows.md`.
2. Apply `docs/diffs/SAMPLE_DIFFS.md` changes.
3. Create `.env` from `.env.example` and set keys/tokens.
4. Copy `code-starters/*` into `services/` in the repo; `docker compose up -d`.
5. Run health checks on ports 8023–8028; then trigger `/orchestrate/roof-scan` with a known address.
6. Verify dashboard mappings per `docs/mapping_table.md`.
7. Commit in small batches; create a PR with checklist from this playbook.
