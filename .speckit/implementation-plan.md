# Fish Mouth Dashboard Implementation Plan

## Technical Architecture

### Enhanced Database Models
First, extend the existing models to support all dashboard features:

```python
# New models needed:
- PropertyScan (enhanced with AI analysis)
- Sequence, SequenceNode, SequenceEnrollment
- VoiceCall, VoiceCallTurn, VoiceCallEvent, VoiceMetricsDaily
- EmailCampaign, SMSCampaign
- AIConfiguration
- Analytics tracking models
- BillingUsage, AuditLog
```

### API Endpoints Structure
```
Lead Generation:
POST   /api/scan/area              # Start area scan
GET    /api/scan/{id}/status       # Get scan progress
GET    /api/scan/{id}/results      # Get scan results
POST   /api/leads/{id}/analyze     # Analyze specific property
GET    /api/leads                  # List leads with filtering
GET    /api/leads/{id}            # Get lead details
PUT    /api/leads/{id}            # Update lead
POST   /api/leads/bulk-action     # Bulk operations

Sequences:
GET    /api/sequences             # List sequences
POST   /api/sequences             # Create sequence
GET    /api/sequences/{id}        # Get sequence details
PUT    /api/sequences/{id}        # Update sequence
POST   /api/sequences/{id}/enroll # Enroll leads
GET    /api/sequences/templates   # Get template library

Voice Agent:
POST   /api/voice/calls/start     # Initiate voice agent call
GET    /api/voice/calls           # List calls (filterable)
GET    /api/voice/calls/{id}      # Get call details + transcript
POST   /api/voice/calls/{id}/end  # Force end call / update outcome
WS     /api/voice/stream/{call_id}# Telnyx media stream bridge
POST   /api/webhooks/telnyx       # Telnyx event handler with Ed25519 verification

Email/SMS:
POST   /api/email/send            # Send email
POST   /api/sms/send              # Send SMS
GET    /api/campaigns             # List campaigns
POST   /api/campaigns             # Create campaign

Analytics:
GET    /api/analytics/dashboard   # Dashboard metrics
GET    /api/analytics/performance # Performance data
GET    /api/analytics/export      # Export reports
GET    /api/voice/analytics/daily # Voice-specific KPIs

Settings:
GET    /api/settings/ai           # Get AI configuration
PUT    /api/settings/ai           # Update AI settings
GET    /api/settings/integrations # Get integrations
PUT    /api/settings/profile      # Update profile

Admin Billing & Compliance:
GET    /api/admin/billing/summary             # Revenue & margin overview
GET    /api/admin/billing/usage               # Aggregated usage ledger
GET    /api/admin/billing/users/{id}          # Usage per customer
POST   /api/admin/billing/users/{id}/provision# Stripe provisioning flow
GET    /api/admin/billing/export              # CSV export (all usage)
GET    /api/admin/billing/export/period       # CSV export (custom range)
DELETE /api/admin/users/{id}/forget           # Right-to-be-forgotten
GET    /api/admin/audit-logs                  # Filterable audit trail
```

## Implementation Strategy

### Step 1: Enhanced Data Models
Create comprehensive models that support all features while maintaining compatibility with existing data.

### Step 2: Provider Service Architecture
Build service layer with production integrations that gracefully fall back to deterministic mocks when credentials are absent:
- Deepgram + ElevenLabs + Telnyx adapters for live voice streaming
- OpenAI/Anthropic adapters for conversation + summarization
- Telnyx SMS adapter with mock fallback
- Stripe billing helpers for provisioning and metered usage (with local ledger fallback)

### Step 3: Frontend Components
Build reusable component library that maintains design consistency while providing rich functionality.

### Step 4: State Management
Implement proper state management for complex features like:
- Real-time scan progress
- Sequence builder state
- Call management
- Analytics and billing data
- Admin audit filters & privacy workflows

## Development Priorities

### Priority 1: Core Value Proposition
1. Lead generation with AI analysis
2. Lead management interface
3. Basic automation capabilities

### Priority 2: Advanced Features
1. Visual sequence builder
2. Voice agent integration
3. Comprehensive analytics & operator dashboards
4. Stripe billing + admin provisioning workflows

### Priority 3: Configuration & Polish
1. Settings and customization
2. Error handling and validation
3. Performance optimization
4. Compliance automation (PII encryption + right-to-be-forgotten)

## Quality Assurance

### Testing Strategy
- Component testing for UI elements
- Integration testing for API endpoints
- End-to-end testing for complete workflows
- Performance testing for data-heavy operations
- Encryption/PII round-trip tests and billing ledger rollups

### Code Quality
- TypeScript for type safety
- ESLint/Prettier for code consistency
- Comprehensive error boundaries
- Loading states and error handling

### User Experience
- Responsive design testing
- Accessibility compliance
- Performance optimization
- Cross-browser compatibility

## Mock Data Strategy

### Realistic Data Sets
- Property data with varying conditions
- Lead scores across full spectrum (0-100)
- Diverse geographic areas
- Realistic roof imagery URLs
- Sample conversation transcripts
- Performance metrics with trends

### Demo Scenarios
- New user onboarding flow
- High-value lead discovery
- Successful sequence completion
- Voice call appointment booking
- Analytics showing ROI improvement

This implementation plan ensures we build a production-ready dashboard that demonstrates the full value proposition of Fish Mouth AI while maintaining technical excellence and user experience standards.
