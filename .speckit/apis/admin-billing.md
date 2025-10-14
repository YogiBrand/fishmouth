# Admin Billing & Compliance API

## Overview
These endpoints power the operator dashboard, Stripe provisioning flow, and privacy workflows. All responses are JSON unless noted.

---

## `GET /api/admin/billing/summary`
Returns aggregate usage totals, platform margin, provider cost, and top spenders.

**Query Params**
- `days` (optional, default `30`): Number of days to include.

**Response**
```json
{
  "total_revenue": 123.45,
  "platform_margin_rate": 0.18,
  "platform_margin": 22.22,
  "provider_cost": 101.23,
  "metrics": {
    "voice_seconds": 5400.0,
    "sms_sent": 120.0,
    "emails_sent": 300.0
  },
  "daily_breakdown": [
    { "day": "2024-05-12", "revenue": 4.10, "voice_cost": 3.60, "sms_cost": 0.20, "email_cost": 0.30 }
  ],
  "top_users": [
    { "user_id": 42, "email": "owner@example.com", "spend": 25.00 }
  ],
  "since": "2024-05-01",
  "days": 30
}
```

---

## `POST /api/admin/billing/users/{user_id}/provision`
Creates or reuses a Stripe customer and subscription for a tenant. Stores `stripe_customer_id`, `stripe_subscription_id`, and `stripe_subscription_item_id` on the `users` table.

**Body**
```json
{ "price_id": "price_123" }
```

`price_id` is optional; defaults to `STRIPE_PRICE_ID` when omitted.

**Response**
```json
{
  "stripe_customer_id": "cus_abc",
  "stripe_subscription_id": "sub_123",
  "stripe_subscription_item_id": "si_456"
}
```

---

## `GET /api/admin/billing/usage`
Returns ledger rows grouped by day and metric.

**Query Params**
- `limit` (optional, default `200`, max `500`)

**Response**
```json
[
  {
    "day": "2024-05-12",
    "metric": "voice_seconds",
    "quantity": 1800.0,
    "cost_usd": 5.40,
    "metadata": { "call_id": "..." }
  }
]
```

---

## `GET /api/admin/billing/users/{user_id}`
Usage ledger for a single customer. Same schema as `/usage`.

---

## `GET /api/admin/billing/export`
Streams a CSV of all billing usage (`day,user_id,metric,quantity,cost_usd`).

---

## `GET /api/admin/billing/export/period`
Streams a CSV of aggregated usage per user (includes provider cost & platform margin).

**Query Params**
- `start` (ISO date, optional; default = 30 days ago)
- `end` (ISO date, optional; default = today)

---

## `DELETE /api/admin/users/{user_id}/forget`
Right-to-be-forgotten workflow. Removes encrypted PII from leads, wipes voice events, billing usage, audit logs, and anonymizes the user account.

**Response**
```json
{ "status": "forgotten" }
```

---

## `GET /api/admin/audit-logs`
Filterable audit trail supporting:
- `limit` (<= 500)
- `action`
- `entity`
- `user_id`
- `date_from` / `date_to` (ISO strings)
- `search` (partial match on action/entity/entity_id)

Returns objects with `id`, `user_id`, `action`, `entity`, `entity_id`, `metadata`, `created_at`.

