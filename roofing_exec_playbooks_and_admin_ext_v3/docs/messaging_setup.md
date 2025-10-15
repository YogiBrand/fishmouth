# Messaging & Deliverability Setup (Admin)

1) **Choose a provider**: start with **SMTP** or **Resend/SendGrid/Mailgun/SES**.
2) In Admin → Messaging → Providers, save credentials and default From address.
3) In **Domain & Deliverability**, enter your domain and click **Verify** (checks SPF, DKIM, DMARC).
4) If your provider needs DNS:
   - For DKIM: use **Generate DKIM** (self-host) or copy values from provider.
   - For DMARC: add a TXT at `_dmarc.<domain>` with `v=DMARC1; p=none; rua=mailto:dmarc@<domain>` initially.
   - For SPF: ensure one `v=spf1` TXT exists; include your provider (`include:sendgrid.net`, etc.).
5) Optional Cloudflare automation: add zone id + token; click **Apply** to create DNS records.

**Notes**
- Start with `p=none` for DMARC; once deliverability is good, move to `p=quarantine` or `reject`.
- Keep a dedicated subdomain for marketing (e.g., `mail.example.com`) to isolate reputation.
