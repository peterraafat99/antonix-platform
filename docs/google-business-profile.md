# Google Business Profile proof-of-concept setup

This document reflects Google's official documentation checked on 2026-08-08. Google can change access requirements and policies; recheck the linked pages before production rollout.

## 1. Eligibility and API access

Business Profile APIs are not generally open. Google requires a valid Google Account, legitimate business reason, Google Cloud project, and valid business website. Submit the [Business Profile API access request](https://developers.google.com/my-business/content/overview) and wait for approval. A quota of zero means the project has not received access; do not treat that as an application bug.

Third-party agencies should create a Business Profile Organization account. See [Google's account model](https://developers.google.com/my-business/content/accounts).

Google states that there is no sandbox and fake/test listings are not permitted as production substitutes. This repository therefore supplies an explicit local mock mode, while live proof still requires a real verified location.

## 2. Google Cloud project

Use the same approved Cloud project for API enablement and OAuth credentials. Google's [current basic setup](https://developers.google.com/my-business/content/basic-setup) lists eight associated APIs to enable:

1. Google My Business API
2. My Business Account Management API
3. My Business Lodging API
4. My Business Place Actions API
5. My Business Notifications API
6. My Business Verifications API
7. My Business Business Information API
8. My Business Q&A API

Phase 2 directly exercises Google My Business API, Account Management API, and Business Information API. The Google My Business API might not appear in the console until access is approved.

If using Google Workspace, the Workspace administrator must enable Google Business Profile and Google Search/Maps services or calls can return `PERMISSION_DENIED`.

## 3. OAuth consent and client

Configure the OAuth consent screen with the agency's real product name, domain, privacy policy, and support contact. Add test users while the consent application is in testing. Public use of the scope can require Google's OAuth app verification.

Create an OAuth client with application type **Web application**.

Authorized development redirect URI:

```text
http://localhost:3000/api/google/callback
```

Production redirect URI:

```text
https://YOUR_APP_DOMAIN/api/google/callback
```

The configured URI and `GOOGLE_OAUTH_REDIRECT_URI` must match exactly.

The application requests only:

```text
https://www.googleapis.com/auth/business.manage
```

This is the current scope documented for [accounts.list](https://developers.google.com/my-business/reference/accountmanagement/rest/v1/accounts/list), [locations.list](https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list), review listing, and [reply updates](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/updateReply).

The OAuth flow follows Google's [web-server authorization guidance](https://developers.google.com/identity/protocols/oauth2/web-server): authorization code, state validation, offline access, PKCE, secure refresh-token storage, and refresh at expiry.

## 4. Application secrets

Copy `.env.example` to `.env.local` and set:

```dotenv
APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/google/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=...
GOOGLE_API_MOCK=false
```

Generate the encryption key once:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Store production values in the hosting platform's encrypted secret manager. Never expose the client secret, service-role key, refresh token, or encryption key through `NEXT_PUBLIC_*` variables.

## 5. Apply the database migration

Local:

```powershell
npx supabase db reset
npx supabase test db
```

Hosted:

```powershell
npx supabase link --project-ref <project-ref>
npx supabase db push
```

The Phase 2 migration creates tenant-scoped connection/location metadata and a private token table. It also creates service-role-only token RPCs.

## 6. Live test procedure

1. Sign in to ReplyPilot as an active `business_owner`.
2. Open `/dashboard/google`.
3. Click **Connect Google Business Profile**.
4. Select the Google Account that manages the test business and grant consent.
5. Confirm that accessible Business Profile accounts are shown.
6. Select an account and load locations.
7. Enable a verified location.
8. Open reviews; confirm the displayed data matches Google Business Profile.
9. Enter a safe test reply, check the explicit confirmation, and publish.
10. Verify the reply in Google's Business Profile UI.
11. Reconnect and confirm that refresh-token preservation works when Google does not return a new refresh token.

The endpoints used are:

```text
GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts
GET https://mybusinessbusinessinformation.googleapis.com/v1/accounts/{account}/locations
GET https://mybusiness.googleapis.com/v4/accounts/{account}/locations/{location}/reviews
PUT https://mybusiness.googleapis.com/v4/accounts/{account}/locations/{location}/reviews/{review}/reply
```

Business Information v1 requires `readMask`; the application requests `name,title,storeCode`.

## 7. Mock test procedure

For local UI and security testing without Google approval:

```dotenv
GOOGLE_API_MOCK=true
```

Keep valid Supabase and encryption settings. Connect Google, load the mock account and location, enable it, view two mock reviews, and submit a mock reply. Mock mode makes no Google network calls and is clearly marked in the connection result. Never enable it in production.

## 8. Common errors

- `redirect_uri_mismatch`: OAuth client URI differs from `GOOGLE_OAUTH_REDIRECT_URI`.
- `PERMISSION_DENIED` / HTTP 403: project not approved, API disabled, quota is zero, Workspace service disabled, or user lacks profile access.
- `RESOURCE_EXHAUSTED` / HTTP 429: quota exceeded; use bounded retry/backoff in later background processing.
- Missing refresh token: Google commonly returns it only on first consent. Reconnect preserves an existing token; otherwise revoke the app in Google Account permissions and consent again.
- Reviews unavailable: location is not verified, account/location ids do not belong together, or the signed-in Google user lacks owner/manager rights.
- Token refresh failed: access was revoked or expired; reconnect explicitly.
- Empty account/location list: the consenting Google user has no management access to the expected Business Profile.

## 9. Content and consent policy

Google's [Business Profile API policies](https://developers.google.com/my-business/content/policies) require prior specific and express consent before actions such as review replies. This POC never auto-replies and requires an explicit manual confirmation.

Google permits only limited API Content storage for performance, securely and temporarily for no more than 30 calendar days, without manipulation or aggregation. Phase 2 does not persist review content at all; it fetches reviews live. Any later cache must implement and test a 30-day maximum retention policy.

Merchants can revoke access from their Google Account permissions at any time. Production operations must handle revocation and prompt reconnection.
