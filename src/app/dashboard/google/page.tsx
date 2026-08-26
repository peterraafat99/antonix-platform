import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { isGoogleConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessOwnerCompany } from "@/lib/google/context";
import { listGoogleAccounts } from "@/lib/google/client";
import { setGoogleLocationSelection, syncGoogleLocations } from "./actions";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  google_not_configured: "Google integration environment variables are incomplete.",
  consent_denied: "Google authorization was cancelled. No connection was saved.",
  invalid_oauth_state: "The authorization request expired or failed its security check. Please try again.",
  company_access_denied: "Your company access changed during authorization.",
  missing_authorization_code: "Google did not return an authorization code.",
  missing_refresh_token: "Google did not return offline access. Revoke the app in your Google Account and connect again.",
  oauth_callback_failed: "Google authorization could not be completed.",
  location_sync_failed: "Locations could not be loaded. Confirm API approval and account permissions.",
  location_update_failed: "The location selection could not be saved.",
  mock_connect_failed: "The development connection could not be created. Apply the Phase 2 migration first.",
  rate_limited: "Google synchronization rate limit exceeded. Please wait 5 minutes before syncing again.",
};

export default async function GooglePage({ searchParams }: { searchParams: Promise<{ error?: string; connected?: string; synced?: string }> }) {
  const params = await searchParams;
  const configured = isGoogleConfigured();
  const { companyId, context } = await requireBusinessOwnerCompany();
  const supabase = await createClient();
  const { data: connection } = await supabase.from("google_connections").select("id,company_id,status,token_expires_at,last_synced_at,last_error_code,granted_scopes").eq("company_id", companyId).maybeSingle();
  const { data: locations } = await supabase.from("google_locations").select("id,title,store_code,google_account_name,google_location_name,is_selected,is_enabled").eq("company_id", companyId).order("title");
  let accounts: Awaited<ReturnType<typeof listGoogleAccounts>> = [];
  let accountError: string | null = null;
  if (configured && connection?.status === "active") {
    try { accounts = await listGoogleAccounts(connection); } catch { accountError = "Google accounts could not be loaded. The connection may need authorization again."; }
  }
  return (
    <DashboardShell
      kind="business"
      title="Google Business Profile"
      subtitle="Connect with explicit consent, choose managed locations, and prove the review reply workflow."
      isPlatformAdmin={context.globalRole === "platform_admin"}
    >
      <div className="stack">
        {params.error && <div className="notice error" role="alert">{messages[params.error] ?? "The Google operation failed safely."}</div>}
        {params.connected && <div className="notice success">Google Business Profile connected successfully{params.connected === "mock" ? " in mock mode" : ""}.</div>}
        {params.synced && <div className="notice success">Location sync completed: {params.synced} location(s) returned.</div>}
        {!configured && <section className="card"><div className="section-title"><h2>Configuration required</h2><span className="status">Not configured</span></div><p>Add the Google OAuth, service-role, and encryption variables from <code>.env.example</code>. You can set <code>GOOGLE_API_MOCK=true</code> to exercise the pilot without Google credentials.</p></section>}
        <section className="card"><div className="section-title"><h2>Connection</h2><span className="status">{connection?.status ?? "Not connected"}</span></div><p>Permission is requested directly from the business owner. Google passwords never pass through this platform.</p><div className="action-row"><Link className="button primary" aria-disabled={!configured} href={configured ? "/api/google/connect" : "#"}>{connection ? "Reconnect Google" : "Connect Google Business Profile"}</Link>{connection?.last_synced_at && <small>Last synced {new Date(connection?.last_synced_at).toLocaleString()}</small>}</div></section>
        {accountError && <div className="notice error" role="alert">{accountError}</div>}
        {connection?.status === "active" && accounts.length > 0 && <section className="card"><div className="section-title"><h2>Discover locations</h2><span className="status">{accounts.length} account(s)</span></div><form className="inline-form" action={syncGoogleLocations}><label>Google account<select name="accountName" required>{accounts.map((account) => <option key={account.name} value={account.name}>{account.accountName ?? account.name} · {account.type ?? "Account"}</option>)}</select></label><button className="button primary" type="submit">Load locations</button></form></section>}
        <section className="card"><div className="section-title"><h2>Saved locations</h2><span className="status">{locations?.length ?? 0} found</span></div>{locations?.length ? <div className="table-wrap"><table><thead><tr><th>Location</th><th>Store code</th><th>Enabled for pilot</th><th>Reviews</th></tr></thead><tbody>{locations.map((location) => <tr key={location.id}><td><strong>{location.title}</strong><br/><small>{location.google_location_name}</small></td><td>{location.store_code ?? "—"}</td><td><form action={setGoogleLocationSelection}><input type="hidden" name="locationId" value={location.id}/><input type="hidden" name="selected" value={String(!location.is_selected)}/><button className={`button ${location.is_selected ? "secondary" : "primary"}`} type="submit">{location.is_selected ? "Disable" : "Enable"}</button></form></td><td>{location.is_selected ? <Link className="text-link" href={`/dashboard/google/reviews?location=${location.id}`}>Open reviews</Link> : <span>Enable first</span>}</td></tr>)}</tbody></table></div> : <div className="empty">Connect Google and load an account to discover its locations.</div>}</section>
      </div>
    </DashboardShell>
  );
}
