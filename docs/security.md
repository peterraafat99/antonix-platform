# Security

## Tenant isolation

RLS is enabled on every public table. Business owners can manage Google connections and locations only for companies where they hold an active `business_owner` membership. URL ids, form values, account resource names, and review resource names are validated again on the server.

Database policies are exercised by `supabase/tests/tenant_isolation.test.sql` and `supabase/tests/google_tenant_isolation.test.sql`.

## OAuth security

- The connect route requests explicit merchant consent.
- A random, HTTP-only, short-lived state cookie prevents callback CSRF.
- PKCE binds the authorization code to the initiating browser flow.
- The state cookie also binds the flow to a company; callback membership is rechecked.
- Only `https://www.googleapis.com/auth/business.manage` is requested.
- Offline access is requested so background processing can be added later without storing Google passwords.
- Authorization codes and tokens are never included in application logs or browser responses.

## Token security

Tokens are encrypted using AES-256-GCM with a random 96-bit IV and authentication tag. The encryption key comes from a server-only environment secret. Ciphertext is stored in the non-exposed `private` schema. Token RPC execution is granted only to `service_role`.

Key rotation is not automatic in the pilot. Production rotation should introduce a new envelope version, decrypt with the previous key, and re-encrypt with the new key during controlled server-side access.

## API and publication boundaries

Google resource names must match strict account, location, and review patterns. Before publishing a reply, the server confirms that the review path belongs to the selected tenant location. Reply text is trimmed, required, and length-limited. The UI requires an explicit confirmation for the external write.

Google 401 responses trigger one safe token refresh and retry. Refresh failure marks the connection as needing reconnection without leaking provider details.

## Secrets

Only the Supabase URL and anon/publishable key may enter browser code. The service-role key, Google client secret, and token-encryption key must be server-only deployment secrets. `.env.local` is ignored.

## Remaining hardening

Before production automation: add rate limiting, audit events, Cross-Account Protection/revocation handling, monitored key rotation, operational alerting, and security review of the selected Cloudflare adapter/runtime.
