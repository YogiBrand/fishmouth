# AI Gateway (8023) — LLMs via OpenRouter (free‑first)
**Endpoints**
- `POST /chat` — unified OpenAI‑style interface; model routing by tier.
- `GET /limits` — shows current per‑key limits; backs off automatically.

**Guards**
- Enforce `:free` budgets; queue requests; batch where safe; cache deterministic prompts.
