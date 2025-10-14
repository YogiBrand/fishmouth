# Telnyx Configuration Guide

Telnyx provides lower-cost voice and messaging infrastructure compared to Twilio. Follow these steps to connect Fish Mouth to Telnyx.

---

## 1. Create & Verify Your Telnyx Account
1. Visit [telnyx.com/sign-up](https://telnyx.com/sign-up) and create an account.
2. Complete business verification (required for 10DLC texting compliance).
3. Add a payment method to enable purchases.

---

## 2. Generate API Credentials
In the Telnyx Portal:

1. **API Keys** → *Create API Key* → copy the value.
2. **Global Settings → Public Keys** → copy the ED25519 public key (used for webhook verification).

Add the following to `.env`:
```env
TELNYX_API_KEY=KEY...
TELNYX_PUBLIC_KEY=...
```

---

## 3. Purchase a Local Phone Number
1. Navigate to **Numbers → Search & Buy Numbers**.
2. Filter by the area code(s) you serve.
3. Purchase at least one local number (typically $2–$5/month).

Add to `.env`:
```env
TELNYX_PHONE_NUMBER=+1XXXXXXXXXX
```

---

## 4. Configure Messaging Profile
1. Go to **Messaging → Messaging Profiles → Create Profile**.
2. Enable Long Code SMS & MMS (optional).
3. Set the **Webhooks** URL to your deployment: `https://fishmouth.io/api/v1/webhooks/telnyx/sms`.
4. Attach the purchased phone number to this profile.

Copy the profile ID to `.env`:
```env
TELNYX_MESSAGING_PROFILE_ID=...
```

---

## 5. Configure Call Control for Voice
1. Go to **Voice → Call Control Applications → Create Application**.
2. Choose **Call Control API v2**.
3. Set the webhook URL to `https://fishmouth.io/api/v1/webhooks/telnyx/call`.
4. Assign the connection to your purchased number.

Add the connection ID to `.env`:
```env
TELNYX_CONNECTION_ID=...
```

---

## 6. Test the Integration
### Send a Test SMS
```python
import telnyx

telnyx.api_key = "YOUR_TELNYX_API_KEY"

message = telnyx.Message.create(
    from_="+1XXXXXXXXXX",
    to="+1YYYYYYYYYY",
    text="Fish Mouth Telnyx integration ✅"
)

print(message.id)
```

### Place a Programmatic Call
Use the Fish Mouth API (after deployment):
```bash
curl -X POST https://fishmouth.io/api/v1/ai-voice/campaign \
  -H "Content-Type: application/json" \
  -d '{"lead_ids": ["lead-uuid-here"], "contractor_id": "contractor-uuid", "campaign_name": "Telnyx Test"}'
```

---

## 7. Recommended Production Settings
- Register your brand and campaigns for 10DLC (higher deliverability).
- Enable fraud detection & usage alerts within the Telnyx portal.
- Rotate API keys periodically.
- Monitor webhook delivery logs (visible in Telnyx dashboard).

---

## 8. Updated Cost Model
| Service                | Telnyx Cost | Reference |
|------------------------|-------------|-----------|
| Voice (US Outbound)    | ~$0.004/min | 3 minute AI call ≈ $0.012 |
| SMS (US Long Code)     | ~$0.004/msg | Three message follow-up ≈ $0.012 |

Combined with Vapi.ai + Claude, total AI outreach run-rate is ~$0.19 per call.

---

## 9. Environment Variables Summary
```env
TELNYX_API_KEY=
TELNYX_PUBLIC_KEY=
TELNYX_MESSAGING_PROFILE_ID=
TELNYX_CONNECTION_ID=
TELNYX_PHONE_NUMBER=
```

Keep these values secret. Rotate them immediately if they are ever exposed.
