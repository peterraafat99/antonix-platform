import { DashboardShell } from "@/components/dashboard-shell";
import { requirePlatformAdmin } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminUsagePage() {
  await requirePlatformAdmin();
  const adminClient = createAdminClient();

  const [usageRes, companiesRes] = await Promise.all([
    adminClient.from("usage_events").select("*").order("created_at", { ascending: false }),
    adminClient.from("companies").select("id,name,is_enabled"),
  ]);

  const usageEvents = usageRes.data ?? [];
  const companies = companiesRes.data ?? [];

  const pilotCapCompanies = 20;
  const pilotGenerationsMonthly = 2500;
  const activeCompaniesCount = companies.filter((c) => c.is_enabled).length;

  return (
    <DashboardShell kind="admin" title="Pilot Usage & Capacity Limits" subtitle="Monitor pilot limits (20 businesses, 2,500 generations/month, ~100 reviews/biz/month).">
      <div className="stack" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <section className="metrics">
          <article className="card">
            <div className="metric-label">Active Tenants</div>
            <div className="metric-value">{activeCompaniesCount} / {pilotCapCompanies}</div>
            <div style={{ background: "#edf2f7", borderRadius: "4px", height: "8px", marginTop: "0.5rem" }}>
              <div style={{ background: "#3182ce", width: `${Math.min(100, (activeCompaniesCount / pilotCapCompanies) * 100)}%`, height: "100%", borderRadius: "4px" }} />
            </div>
          </article>

          <article className="card">
            <div className="metric-label">Generations Used</div>
            <div className="metric-value">{usageEvents.length} / {pilotGenerationsMonthly}</div>
            <div style={{ background: "#edf2f7", borderRadius: "4px", height: "8px", marginTop: "0.5rem" }}>
              <div style={{ background: "#38a169", width: `${Math.min(100, (usageEvents.length / pilotGenerationsMonthly) * 100)}%`, height: "100%", borderRadius: "4px" }} />
            </div>
          </article>

          <article className="card">
            <div className="metric-label">Infrastructure Tier</div>
            <div className="metric-value" style={{ fontSize: "1.25rem" }}>Supabase Free + Gemini</div>
            <small style={{ color: "#718096" }}>Very low initial cost target</small>
          </article>
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Recent Usage Log Events</h2>
          </div>

          {usageEvents.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Tenant Company ID</th>
                    <th>User ID</th>
                    <th>Event Type</th>
                    <th>Provider</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {usageEvents.slice(0, 50).map((evt) => (
                    <tr key={evt.id}>
                      <td><code>{evt.id.slice(0, 8)}...</code></td>
                      <td><code>{evt.company_id}</code></td>
                      <td>{evt.user_id ? <code>{evt.user_id.slice(0, 8)}...</code> : "System"}</td>
                      <td><span className="status">{evt.event_type}</span></td>
                      <td><strong>{evt.provider}</strong></td>
                      <td>{new Date(evt.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No usage events logged yet.</div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
