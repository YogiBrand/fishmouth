# 🚀 START HERE - Fish Mouth Development

**Welcome to Fish Mouth!** This guide will get you oriented quickly.

---

## 📖 For AI Assistants (Cursor & Claude Code)

### 🌟 Quick Start
1. **Read First**: `.speckit/MASTER_INDEX.md` - Complete feature index
2. **Setup Guide**: `SETUP_FOR_AI_ASSISTANTS.md` - How to use docs effectively
3. **Quick Reference**: `AI_ASSISTANT_QUICK_START.md` - Common commands

### Context Files
- **Cursor Users**: Read `.cursor/context.md`
- **Claude Code Users**: Read `.claude/project-context.md`

---

## 🎯 What is Fish Mouth?

AI-powered lead generation platform for roofing contractors:
- Scans entire cities using aerial imagery
- AI identifies aged roofs (15+ years)
- Generates high-quality leads (60+ score)
- Automates outreach via email, SMS, voice calls
- Integrates with Facebook/Google Ads for campaigns

**Pricing**: $299/month + $1.13 per quality lead (80% margin)

---

## 📚 Complete Documentation

### Main Specifications
- `FISH MOUTH_MASTER_SPEC.md` - Complete system specification
- `SPECKIT_IMPLEMENTATION_COMPLETE.md` - Documentation status

### Speckit (`.speckit/`)
- `MASTER_INDEX.md` - 🌟 **START HERE** - Complete feature index
- `features/lead-detection.md` - AI aerial analysis system
- `features/voice-agent.md` - AI voice calling (11x.ai style)
- `features/sequence-builder.md` - Paragon-style automation
- `features/onboarding.md` - 5-step wizard

### Project Setup
- `README.md` - Project overview & quick start
- `SETUP_FOR_AI_ASSISTANTS.md` - Detailed AI assistant guide
- `AI_ASSISTANT_QUICK_START.md` - Quick commands

---

## 🔧 Development Setup

```bash
# 1. Clone & navigate
cd /home/yogi/fishmouth

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start all services
docker-compose up -d

# 4. Access:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:8000
# - API Docs: http://localhost:8000/docs
# - n8n: http://localhost:5678
```

---

## 🤖 Using with AI Assistants

### Cursor
```bash
cursor /home/yogi/fishmouth
```

**Then in chat**:
```
"Read .speckit/MASTER_INDEX.md for complete context. 
I need to implement the sequence builder with vertical layout."
```

### Claude Code
```bash
code /home/yogi/fishmouth
```

**Then in chat**:
```
"Read .claude/project-context.md and .speckit/MASTER_INDEX.md. 
Help me implement the AI voice calling system."
```

---

## ✅ Implementation Status

### Completed ✓
- [x] Complete backend API
- [x] Database models
- [x] Authentication (JWT)
- [x] Lead detection system
- [x] Pricing model implementation
- [x] Docker setup
- [x] **Complete speckit documentation**

### In Progress ⏳
- [ ] Sequence builder UI
- [ ] AI voice integration (backend done)
- [ ] AI customization settings
- [ ] Complete onboarding wizard

---

## 📞 Need Help?

1. **Read Docs First**: `.speckit/MASTER_INDEX.md` has everything
2. **AI Assistants**: Use context files for full understanding
3. **Code Examples**: Check existing components for patterns

---

**Ready to build!** Both Cursor and Claude Code have complete context via speckit.

**Last Updated**: January 10, 2025
