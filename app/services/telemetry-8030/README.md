# Telemetry Gateway (8030)

**POST /event** — accepts usage events.
**POST /cost** — accepts cost events.

Add the provided FastAPI middleware to each service to emit a usage event per request; add explicit cost events where you know itemized costs (LLM tokens, SMS, etc.).
