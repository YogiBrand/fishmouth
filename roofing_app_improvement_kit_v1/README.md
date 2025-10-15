# Roofing App Improvement Kit v1
**Date:** 2025-10-15

This kit contains implementation guides, code stubs, prompts, and DevOps assets to upgrade your local-first roofing intelligence platform to a **free-first, tiered quality** architecture. It is designed to drop into your repo **without large code rewrites**—use the _diff guides_ and _Codex workflows_ to apply minimal changes safely.

## What’s inside
- `docs/` — Architecture map, end‑to‑end workflows, tiered data plan, and per‑service improvement guides.
- `docs/codex_workflows/` — Single‑agent and multi‑agent execution playbooks to drive automated refactors.
- `prompts/` — Production‑ready prompt templates (owner report, damage description, outreach, storm risk).
- `code-starters/` — Minimal FastAPI services for new micro‑services (8023–8028) and glue code.
- `config/` — `docker-compose.additions.yml` and `.env.example` to align ports and env vars.
- `scripts/` — Crawler and registry utilities; integrity checks for mocked data -> dashboard mapping.

## How to use
1. **Read** `docs/overview.md` and `docs/architecture_map.md`.
2. **Copy** `config/docker-compose.additions.yml` fragments into your existing compose (or use as overlay).
3. **Add env vars** from `.env.example` to your local `.env`.
4. **Drop** any needed `code-starters/*` services into your repo under `services/` and build locally.
5. **Run** the Codex automation using the playbooks in `docs/codex_workflows` (single or multi‑agent).

> Wherever a full file replacement is **not** required, this kit provides **precise, ordered change lists** in Markdown so your agent(s) can patch files surgically instead of replacing them.
