import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBusinessOwnerCompany } from "@/lib/google/context";
import { createOAuthRequest, GOOGLE_BUSINESS_SCOPE } from "@/lib/google/oauth";
import { getGoogleEnv, isGoogleConfigured } from "@/lib/env";

export async function GET() {
  if (!isGoogleConfigured()) return NextResponse.redirect(new URL("/dashboard/google?error=google_not_configured", process.env.APP_URL ?? "http://localhost:3000"));
  const { context, companyId } = await requireBusinessOwnerCompany();
  const env = getGoogleEnv();
  if (env.GOOGLE_API_MOCK === "true") {
    const admin = createAdminClient();
    const { error } = await admin.from("google_connections").upsert({
      company_id:companyId, connected_by_user_id:context.userId, status:"active",
      granted_scopes:[GOOGLE_BUSINESS_SCOPE], token_expires_at:new Date(Date.now()+3_600_000).toISOString(), last_error_code:null,
    }, { onConflict:"company_id" });
    if (error) {
      console.error("Mock Google connection failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
    const target = error ? "/dashboard/google?error=mock_connect_failed" : "/dashboard/google?connected=mock";
    return NextResponse.redirect(new URL(target, env.APP_URL));
  }
  const { state, verifier, authorizationUrl } = createOAuthRequest();
  const response = NextResponse.redirect(authorizationUrl);
  const options = { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax" as const, path:"/api/google", maxAge:600 };
  response.cookies.set("gbp_oauth_state", state, options);
  response.cookies.set("gbp_oauth_verifier", verifier, options);
  response.cookies.set("gbp_oauth_company", companyId, options);
  return response;
}
