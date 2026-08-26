# Architecture

## Request and authorization flow

1. `src/proxy.ts` refreshes Supabase's cookie-backed session.
2. Protected layouts call `getUser()` to revalidate identity.
3. The application loads profile and active memberships through RLS.
4. Server helpers enforce platform-admin or business-owner requirements.
5. PostgreSQL policies independently constrain every tenant row.

## Phase 1 data

`auth.users` owns credentials. `profiles` adds a global platform role. `companies` is the tenant. `company_members` is a many-to-many user mapping with role and lifecycle status.

## Google integration

`google_connections` stores tenant-scoped connection metadata only. `private.google_oauth_tokens` stores encrypted token envelopes and is not exposed through the Data API. Two service-role-only RPCs read and write token ciphertext.

`google_locations` supports multiple Google locations per company and stores only operational identifiers and selection state. A company is not assumed to equal a location.

The Google modules are separated by concern:

- `oauth.ts`: consent URL, state/PKCE, code exchange, and refresh exchange
- `crypto.ts`: versioned AES-256-GCM envelopes
- `tokens.ts`: server-only token persistence and refresh lifecycle
- `client.ts`: current REST endpoints plus explicit mock responses
- `context.ts`: business-owner company boundary

## External API flow

```text
Business owner -> consent route -> Google authorization
Google -> callback -> state + company membership verification
Callback -> token exchange -> encrypted token RPC
Dashboard -> account list -> location list -> selected location
Reviews page -> live reviews -> confirmed manual PUT reply
```

Account listing uses Account Management v1. Location listing uses Business Information v1 with a read mask. Review listing and replies use Google My Business API v4.9.

## Review data

Review text is fetched on demand and not stored in Phase 2. Connection/location identifiers and synchronization timestamps remain operational metadata. A future review cache must implement a maximum 30-day retention policy and avoid aggregation of cached Google content.

## Deferred components

AI provider abstraction, review workflow persistence, audit logs, Pub/Sub processing, email, notifications, usage events, and analytics remain later milestones.
