# PRD‑02 · Token & Template Engine (Unified Variables)

**Problem**: Inconsistent tokens and ad-hoc templating cause broken content.

**Goal**: Single resolver across reports, emails, SMS with strong typing and defaults.

**API**
- `GET /api/v1/templates`
- `PUT /api/v1/templates/{id}` upsert
- `POST /api/v1/templates/preview` → `{html/text, unresolved_tokens: []}`

**Tokens**: `{{lead.*}}`, `{{company.*}}`, `{{report.*}}`, `{{now}}`. Provide defaults (e.g., missing `first_name` → "Homeowner").

**Acceptance**
- Previews highlight unresolved tokens and suggest fixes.
- Sends blocked if critical tokens unresolved.
