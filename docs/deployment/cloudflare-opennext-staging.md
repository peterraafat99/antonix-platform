# Staging Deployment Runbook: Cloudflare Workers via OpenNext

This runbook describes the procedure to build, configure, and deploy the Next.js review management platform to **Cloudflare Workers** using the **OpenNext Cloudflare adapter** for `https://staging.antonix.nl`.

---

## 1. Prerequisites

1. **Cloudflare Account & DNS**:
   - `antonix.nl` zone managed in Cloudflare.
   - DNS record `staging.antonix.nl` proxied through Cloudflare (Orange Cloud).
   - Bot Fight Mode enabled in Cloudflare Security settings.
2. **Supabase Development Project (`replypilot-dev` / `riyncxjkkstinbktnsor`)**:
   - Apply migration: `supabase/migrations/202608220001_security_pilot_quotas_and_scheduling.sql`
   - In Supabase Dashboard -> **Authentication** -> **URL Configuration**:
     - **Site URL**: `https://staging.antonix.nl`
     - **Redirect URLs**:
       - `https://staging.antonix.nl/**`
       - `http://localhost:3000/**`

---

## 2. Cloudflare Secrets Configuration (Never in Git)

Set the following secrets using the Wrangler CLI for the `staging` environment:

```bash
# Supabase credentials
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL --env staging
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --env staging
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging

# Encryption and Provider Keys
npx wrangler secret put GOOGLE_TOKEN_ENCRYPTION_KEY --env staging
npx wrangler secret put GEMINI_API_KEY --env staging

# Cloudflare Turnstile (Optional)
npx wrangler secret put TURNSTILE_SECRET_KEY --env staging
```

> [!IMPORTANT]
> Keep `GOOGLE_API_MOCK=true` in staging until Google Business Profile API OAuth approval is granted.

---

## 3. Build & Deploy Workflow

### Step A: Install OpenNext Cloudflare Adapter (when deploying)
```bash
npm install --save-dev @opennextjs/cloudflare wrangler
```

### Step B: Build with OpenNext
```bash
npx @opennextjs/cloudflare
```

### Step C: Deploy Staging Worker
```bash
npx wrangler deploy --env staging
```

---

## 4. Post-Deployment Verification Checklist

- [ ] **Public Site**: Navigate to `https://staging.antonix.nl` and verify landing page styling and typography.
- [ ] **Authentication**: Log in with demo account on `https://staging.antonix.nl/login`.
- [ ] **Cross-Tenant Isolation**: Confirm workspace only loads locations and drafts for the authenticated company.
- [ ] **AI Draft Generation**: Trigger AI reply generation for a mock review.
- [ ] **Safety & Auto-Publish Delay**: Verify 4-5 star reviews enter the scheduled queue with 30-60 min delay.
- [ ] **Pilot Quota**: Verify daily publish limit is capped at 20 replies/day.
- [ ] **Rate Limiting**: Trigger rapid requests to verify HTTP 429 Too Many Requests response.
