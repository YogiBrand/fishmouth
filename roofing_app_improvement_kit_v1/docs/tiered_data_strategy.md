# Tiered Data Strategy (Free → Hybrid → Premium)

**Regular (Free & Self‑hosted)**  
- Geocoding: Nominatim (respect 1 r/s).  
- Routing/Isochrones: OpenRouteService Standard plan.  
- Imagery: USGS/NAIP, USGS National Map; Mapillary for street.  
- Demographics/Economics: U.S. Census ACS; Building Permits Survey.  
- Storms/Weather: NWS Alerts, NCEI Storm Events.  
- Contacts: OSINT (Buster permutator, Sherlock, Reacher email verify).  
- LLMs: OpenRouter `:free` models with rate guards; optional local Ollama.

**Optimized (Hybrid)**  
- Upgrade only when **Quality Engine** flags: premium imagery (Bing/Google), ATTOM/Estated property APIs, Hunter/Apollo contacts, better LLMs via OpenRouter (GPT‑4 / Claude).

**Priority (Premium/Enterprise)**  
- Consistent premium across stack; executive contact data, advanced imagery and paid weather; larger geocoding/routing quotas; fine‑tuned models.
