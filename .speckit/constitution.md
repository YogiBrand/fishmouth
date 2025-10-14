# Fish Mouth Dashboard Development Constitution

## Project Principles

### Core Mission
Build a production-ready, fully functional dashboard for Fish Mouth AI that provides tremendous value to roofing contractors through comprehensive lead generation, automation, and analytics capabilities.

### Development Standards
1. **Specification-Driven Development**: Every feature must be fully specified before implementation
2. **Production Quality**: Code must be production-ready with proper error handling, validation, and user experience
3. **Seamless Integration**: All features must integrate seamlessly with existing authentication and infrastructure
4. **Mock-Ready**: Use mock API keys and data that demonstrate full functionality
5. **User Experience**: Maintain the vertical navigation design aesthetic from current dashboard
6. **Provider-Ready**: Integrations with Telnyx, Deepgram, ElevenLabs, Stripe, etc. must be production-safe with graceful fallbacks when credentials are absent
7. **Value-Driven**: Every feature must provide clear, measurable value to roofing contractors
8. **Privacy-First**: PII encryption, audit logs, and right-to-be-forgotten workflows are mandatory for launch

### Technical Constraints
- Maintain existing React + FastAPI architecture
- Use existing vertical navigation layout from current dashboard
- Integrate with existing authentication system
- Use Docker infrastructure
- Support responsive design (mobile + desktop)
- Implement real functionality with mock fallbacks (no stubs in production paths)
- Verify Telnyx callbacks via Ed25519 (fallback to HMAC only when necessary)

### Quality Gates
- All features must be fully functional, not just UI mockups
- Code must be clean, documented, and maintainable
- User interface must be intuitive and professional
- Performance must be optimized for production use
- Error handling must be comprehensive and user-friendly

### Success Criteria
- Dashboard provides complete lead management workflow
- AI features demonstrate intelligent automation
- Users can scan areas, manage leads, run sequences, and track analytics
- System shows clear ROI and business value
- All integrations work seamlessly together
