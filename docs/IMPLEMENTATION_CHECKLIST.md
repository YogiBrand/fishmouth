# Fish Mouth Implementation Checklist

## Backend Files
- [x] backend/app/services/permit_scraper.py
- [x] backend/app/services/contagion_analyzer.py
- [x] backend/app/services/report_generator.py
- [x] backend/app/services/email_service.py
- [x] backend/app/services/ai_voice_agent.py
- [x] backend/app/services/branding_service.py
- [x] backend/app/services/mail_service.py
- [x] backend/app/api/v1/contagion.py
- [x] backend/app/api/v1/reports.py
- [x] backend/app/api/v1/dashboard.py
- [x] backend/app/api/v1/webhooks.py
- [x] backend/app/api/v1/ai_voice.py
- [x] backend/app/api/v1/branding.py
- [x] backend/app/api/v1/mailers.py
- [x] backend/app/migrations/002_add_contagion_model.py
- [x] backend/app/migrations/003_branding_mailers.py
- [x] backend/scripts/seed_mock_data.py

## Frontend Files
- [x] frontend/src/pages/Dashboard.jsx
- [x] frontend/src/pages/AdminDashboard.jsx
- [x] frontend/src/components/ContagionHeatmap.jsx
- [x] frontend/src/components/LeadsTable.jsx
- [x] frontend/public/report-viewer.jsx

## Database
- [x] Migration 002 (contagion/reporting foundation)
- [x] Migration 003 (branding showcase + mailers)
- [x] PostGIS extension usage with spatial indexes

## Integrations
- [x] Google Maps Geocoding API (geocoding in scraper)
- [x] Mapbox token consumption for the heatmap
- [x] Anthropic Claude for voice scripting and branding copy
- [x] Vapi.ai for AI voice orchestration
- [x] Telnyx Call Control + Messaging APIs
- [x] SendGrid for report delivery emails
- [x] Direct mail print API connector (mock)

## Testing & Verification
- [x] Python modules compile (`python3 -m compileall app`)
- [x] Demo data seeding script populates connected tables
- [x] WebSocket activity stream exercised via dashboard
- [x] PDF generation path returns downloadable link
- [x] Showcase generation returns shareable URL
- [x] Telnyx webhook signature verification implemented

## Deployment Notes
- [x] Deployment guide with Docker workflow
- [x] Telnyx setup documentation with pricing & configuration
- [x] Environment template updated with direct mail keys

All tasks above are fully implemented in this workspace snapshot.
