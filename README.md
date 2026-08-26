# ReplyPilot

A production-minded multi-tenant SaaS pilot for agencies and businesses managing Google Business Profile reviews and, in later phases, AI-assisted replies.

## Completed scope

### Phase 1: secure foundation

Next.js 16, strict TypeScript, Tailwind CSS, Supabase SSR authentication, platform-admin and business-owner authorization, companies, memberships, migrations, RLS, protected dashboards, and tenant-isolation tests.

### Phase 2: Google Business Profile proof of concept

- Explicit business-owner OAuth consent using the single `business.manage` scope
- OAuth state validation, PKCE, offline access, and refresh handling
- AES-256-GCM token encryption
- Refresh/access tokens stored in a non-exposed PostgreSQL schema
- Server-only service-role RPCs for token access
- Account discovery through Account Management API v1
- Location discovery through Business Information API v1
- Live, on-demand review listing through Google My Business API v4.9
- Tenant-checked manual review reply publishing
- Explicit development mock path when Google credentials or approval are unavailable

The live integration is implemented but cannot be represented as verified until a Google-approved Cloud project and a real verified Business Profile are configured.

Pilot target: approximately 20 active companies and 2,500 AI generations per month.

## Architecture

- **Application:** Next.js App Router, server components, route handlers, and server actions.
- **Identity:** Supabase Auth with server-revalidated sessions.
- **Tenancy:** `companies` are tenants; `company_members` assigns users; `google_locations` remains distinct from companies.
- **Google:** REST calls stay behind `src/lib/google`. Business logic never exposes OAuth tokens to browser code.
- **Security:** PostgreSQL RLS plus server authorization. Token ciphertext is inaccessible to authenticated users.

See [docs/architecture.md](docs/architecture.md), [docs/security.md](docs/security.md), and [docs/google-business-profile.md](docs/google-business-profile.md).

## Local setup

Requirements: Node.js 22+, pnpm or npm, Docker Desktop, and the Supabase CLI.

```powershell
cd D:\review-ai-platform
pnpm install --store-dir D:\review-ai-platform\.pnpm-store
Copy-Item .env.example .env.local
npx supabase start
npx supabase db reset
npm run dev
```

Open `http://localhost:3000`.

For hosted Supabase:

```powershell
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## First admin and pilot company

Create users through Supabase Authentication, then promote the first administrator:

```sql
update public.profiles
set global_role = 'platform_admin'
where id = (select id from auth.users where email = 'admin@example.com');
```

Create a company and owner membership:

```sql
insert into public.companies (name, slug) values ('Example Company', 'example-company');
insert into public.company_members (company_id, user_id, member_role)
select c.id, u.id, 'business_owner'
from public.companies c cross join auth.users u
where c.slug = 'example-company' and u.email = 'owner@example.com';
```

## Environment variables

Required for Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `APP_URL`

Required for live Google integration:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_TOKEN_ENCRYPTION_KEY` (base64-encoded 32 bytes)
- `GOOGLE_API_MOCK=false`

Generate an encryption key:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

For credential-free local UI testing, set `GOOGLE_API_MOCK=true`. Mock mode is explicit and must never be enabled in production.

## Commands

- `npm run dev` — development server
- `npm run build` — production build
- `npm run typecheck` — strict TypeScript check
- `npm run lint` — ESLint
- `npm test` — authorization, encryption, OAuth-state, and resource-validation tests
- `npx supabase test db` — database RLS tests

On a space-constrained Windows machine, keep temporary test files on D:

```powershell
$env:TEMP='D:\review-ai-platform\.tmp'
$env:TMP=$env:TEMP
npm test
```

## Google test sequence

1. Complete the external requirements in `docs/google-business-profile.md`.
2. Apply both migrations.
3. Sign in as a business owner.
4. Open `/dashboard/google` and connect Google.
5. Select an accessible account and load locations.
6. Enable one verified location.
7. Open its reviews.
8. Write, confirm, and publish one manual reply.
9. Verify the reply directly in Google Business Profile.

## Review-content policy

Phase 2 fetches review content live and does not persist it. Google currently permits only limited, secure, temporary content storage for no more than 30 days. Any later cache must enforce that limit and must not aggregate or manipulate cached Google content.

## Deployment

Apply migrations before deploying. Store the service-role key, Google client secret, and token-encryption key as server-only secrets. Authentication and OAuth callback responses must not be shared-cached. The mock flag must be false in production.

## Known limitations

There is no self-service signup, company form, invitation email, AI generation, automated review ingestion, Pub/Sub, notification email, analytics, or audit-log UI yet. The Phase 2 POC lists the first account page, up to 100 locations, and the first 50 reviews. Live Google verification still requires external approval and credentials.

## Next milestone

Phase 3 is the AI service: provider abstraction, Gemini implementation, structured output validation, company questionnaire/settings, prompt builder tests, and review-reply generation without publishing raw model output.
