import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/server";
import { exchangeAuthorizationCode, GOOGLE_BUSINESS_SCOPE, statesMatch } from "@/lib/google/oauth";
import { decryptSecret } from "@/lib/google/crypto";
import { getStoredTokens, storeTokens } from "@/lib/google/tokens";
import { getGoogleEnv, isGoogleConfigured } from "@/lib/env";

const cookieNames = ["gbp_oauth_state","gbp_oauth_verifier","gbp_oauth_company"] as const;

function redirectResponse(path: string) {
  const response = NextResponse.redirect(new URL(path, getGoogleEnv().APP_URL));
  for (const name of cookieNames) response.cookies.delete({ name, path:"/api/google" });
  return response;
}

export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) return NextResponse.redirect(new URL("/dashboard/google?error=google_not_configured", process.env.APP_URL ?? "http://localhost:3000"));
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return redirectResponse("/dashboard/google?error=consent_denied");
  const store = await cookies();
  const state = store.get("gbp_oauth_state")?.value;
  const verifier = store.get("gbp_oauth_verifier")?.value;
  const companyId = store.get("gbp_oauth_company")?.value;
  if (!statesMatch(params.get("state"), state) || !verifier || !companyId) return redirectResponse("/dashboard/google?error=invalid_oauth_state");
  const context = await requireUser();
  const ownsCompany = context.memberships.some((item) => item.companyId === companyId && item.status === "active" && item.role === "business_owner");
  if (!ownsCompany) return redirectResponse("/dashboard/google?error=company_access_denied");
  const code = params.get("code");
  if (!code) return redirectResponse("/dashboard/google?error=missing_authorization_code");
  try {
    const token = await exchangeAuthorizationCode(code, verifier);
    const admin = createAdminClient();
    const { data:connection, error } = await admin.from("google_connections").upsert({
      company_id:companyId, connected_by_user_id:context.userId, status:"active",
      granted_scopes:(token.scope ?? GOOGLE_BUSINESS_SCOPE).split(" "), last_error_code:null,
    }, { onConflict:"company_id" }).select().single();
    if (error || !connection) throw new Error("connection_write_failed");
    let refreshToken = token.refresh_token;
    if (!refreshToken) {
      const existing = await getStoredTokens(connection.id);
      if (existing) refreshToken = decryptSecret(existing.encrypted_refresh_token);
    }
    if (!refreshToken) throw new Error("missing_refresh_token");
    await storeTokens(connection.id, token.access_token, refreshToken, new Date(Date.now() + token.expires_in * 1000));
    return redirectResponse("/dashboard/google?connected=true");
  } catch (error) {
    const safeCode = error instanceof Error && error.message === "missing_refresh_token" ? "missing_refresh_token" : "oauth_callback_failed";
    return redirectResponse(`/dashboard/google?error=${safeCode}`);
  }
}
