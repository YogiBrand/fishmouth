# Overview

This kit operationalizes three goals:
1. **Comprehensive understanding** of the current system and missing links.
2. **Deep research–driven upgrades** using free/open data and self‑hostable services.
3. **Concrete implementation**: micro‑service stubs, compose overlays, prompts, and agent workflows.

## Strategy highlights
- **Free‑first**: Favor self‑hosted and open datasets for launch; switch to paid vendors via *Quality Intelligence* triggers.
- **Micro‑services by function**: AI Gateway (LLMs), Vision AI, Mapping/Geocoding, Quality Engine, OSINT Contacts, Storm/Event Monitor.
- **Deterministic workflows**: From *Address → Imagery → Enhancement → CV → Analytics → Report → Lead* with traceable artifacts.
- **Data routing**: Every datum emitted by a server is specified with a canonical schema and dashboard target.
- **Minimal‑diff integration**: Implementation steps are provided as ordered diffs, avoiding file churn.

See `docs/architecture_map.md` and `docs/workflows.md` for diagrams and step‑by‑step flows.
