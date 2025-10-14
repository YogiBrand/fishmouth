# Fish Mouth Speckit Documentation

## 📚 What is Speckit?

Speckit is a comprehensive documentation framework designed to help AI assistants (like Claude, Cursor, CodeGPT) maintain full context about your codebase. This enables:

- **Faster onboarding** for new developers or AI assistants
- **Consistent code generation** following project patterns
- **Complete system understanding** without reading entire codebase
- **Seamless continuation** across multiple context windows
- **Better collaboration** between humans and AI

## 🗂️ Directory Structure

```
.speckit/
├── project.yaml              # Project metadata & tech stack
├── README.md                 # This file
├── architecture/             # System architecture & design
│   ├── overview.md          # High-level topology & ports
│   └── database-schema.md   # Complete database design
├── features/                 # Feature documentation
│   ├── lead-detection.md    # Lead pipeline
│   ├── voice-agent.md       # AI voice campaigns
│   ├── wallet-rewards.md    # Wallet & gamification
│   ├── admin-dashboard.md   # Admin telemetry
│   └── ...
├── apis/                     # API endpoint documentation
│   ├── README.md            # Endpoint index & links
│   └── ...
├── components/               # Frontend component docs (optional)
│   └── ...
├── prompts/                  # AI prompt templates
│   ├── roof-analysis.md     # Claude Vision prompts
│   ├── voice-agent.md       # Voice conversation
│   ├── email-generation.md  # Email content
│   └── ...
├── deployment/               # Deployment guides
│   ├── local-development.md # Local setup
│   ├── docker.md            # Docker deployment
│   ├── production.md        # Production deploy
│   └── scaling.md           # Scaling strategy
└── testing/                  # Testing documentation
    ├── backend-tests.md     # Backend testing
    ├── frontend-tests.md    # Frontend testing
    └── e2e-tests.md         # End-to-end tests
```

## 🚀 How to Use This Documentation

### For AI Assistants (Claude, Cursor, CodeGPT)

**Starting a new session:**
```
"Read .speckit/project.yaml and .speckit/architecture/overview.md 
to understand the Fish Mouth system. I need help with [specific task]."
```

**For specific features:**
```
"Read .speckit/features/voice-agent.md and help me implement 
the real-time audio streaming feature."
```

**For API development:**
```
"Read .speckit/apis/sequences.md and help me add a new endpoint 
for batch lead enrollment."
```

### For Developers

1. **Onboarding**: Start with `architecture/overview.md`
2. **Feature Work**: Read relevant `features/*.md` file
3. **API Changes**: Check `apis/*.md` for existing patterns
4. **UI Updates**: Review `components/*.md` for component structure
5. **Deployment**: Follow `deployment/*.md` guides

## 📋 Documentation Standards

All documentation follows these standards:

1. **Clear Headers**: Use descriptive headings
2. **Code Examples**: Include actual code snippets
3. **Current State**: Mark features as built/in-progress/planned
4. **Architecture Decisions**: Explain why, not just what
5. **Dependencies**: List dependencies and relationships
6. **Migration Guides**: Include upgrade/change instructions

## 🔄 Keeping Documentation Updated

**When to update:**
- After adding new features
- When changing major architecture
- After API endpoint changes
- When updating business logic
- After significant refactoring

**What to update:**
- Feature status in `project.yaml`
- Relevant feature documentation
- API documentation if endpoints changed
- Architecture docs if design changed
- Deployment docs if process changed

## 📖 Key Documentation Files

### Essential Reading
1. `project.yaml` - Project overview & status
2. `architecture/overview.md` - System architecture
3. `architecture/database-schema.md` - All models & relationships
4. `features/` - Individual feature documentation

### API Reference
- `apis/authentication.md` - Auth & user management
- `apis/leads.md` - Lead detection & management
- `apis/voice.md` - Voice agent system
- `apis/sequences.md` - Sequence automation
- `apis/admin.md` - Admin & billing

### Frontend Components
- Create docs under `components/` when a component needs deeper explanation.

### Deployment
- `deployment/local-development.md` - Getting started locally
- `deployment/production.md` - Production deployment
- `deployment/scaling.md` - Scaling strategy

## 🎯 Current System Status

Refer to `.speckit/CURRENT_STATUS.md` for an authoritative, continuously updated status list spanning production-ready features, in-flight work, and planned initiatives.

## 🤝 Contributing to Documentation

**Adding a new feature?**
1. Create `features/your-feature.md`
2. Document API in `apis/your-feature.md`
3. Update `project.yaml` status
4. Add to relevant architecture docs

**Changing existing feature?**
1. Update relevant feature doc
2. Update API docs if changed
3. Note breaking changes
4. Update migration guide

## 💡 Best Practices

1. **Be Specific**: Include actual file paths, function names, endpoint URLs
2. **Show Examples**: Real code > descriptions
3. **Explain Decisions**: Why this approach was chosen
4. **Link Related Docs**: Cross-reference related documentation
5. **Keep Current**: Update docs as code changes
6. **Include Diagrams**: Visual explanations when helpful

## 📞 Questions?

If documentation is unclear or missing:
- Open an issue in the internal tracker
- Contact: dev@fishmouth.com
- Check main README.md and FISHMOUTH_MASTER_SPEC.md

---

**Last Updated**: 2025-10-14  
**Maintained By**: Development Team  
**Next Review**: 2025-11-13



