import { DashboardShell } from "@/components/dashboard-shell";
import { requirePlatformAdmin } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Company, UsageEvent } from "@/lib/database.types";

export default async function AdminAnalyticsPage() {
  await requirePlatformAdmin();
  const adminClient = createAdminClient();

  const [usageRes, companiesRes] = await Promise.all([
    adminClient.from("usage_events").select("*").order("created_at", { ascending: false }),
    adminClient.from("companies").select("id,name,slug"),
  ]);

  const usageEvents = (usageRes.data as UsageEvent[]) ?? [];
  const companies = (companiesRes.data as Company[]) ?? [];
  const companiesMap = new Map<string, Company>(companies.map((c) => [c.id, c]));

  // Aggregate by company
  const companyUsageMap = new Map<string, { companyName: string; totalGenerations: number; mockCount: number; geminiCount: number }>();
  for (const event of usageEvents) {
    const entry = companyUsageMap.get(event.company_id) ?? {
      companyName: companiesMap.get(event.company_id)?.name ?? event.company_id,
      totalGenerations: 0,
      mockCount: 0,
      geminiCount: 0,
    };
    entry.totalGenerations++;
    if (event.provider === "gemini") entry.geminiCount++;
    else entry.mockCount++;
    companyUsageMap.set(event.company_id, entry);
  }

  const usageBreakdown = Array.from(companyUsageMap.values());

  return (
    <DashboardShell kind="admin" title="Platform Analytics" subtitle="System generation performance and provider analytics.">
      <div className="stack" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <section className="metrics">
          <article className="card">
            <div className="metric-label">Total Generations logged</div>
            <div className="metric-value">{usageEvents.length}</div>
          </article>
          <article className="card">
            <div className="metric-label">Mock Provider Calls</div>
            <div className="metric-value">{usageEvents.filter((e) => e.provider === "mock").length}</div>
          </article>
          <article className="card">
            <div className="metric-label">Gemini API Calls</div>
            <div className="metric-value">{usageEvents.filter((e) => e.provider === "gemini").length}</div>
          </article>
          <article className="card">
            <div className="metric-label">Active Tenants Generating</div>
            <div className="metric-value">{companyUsageMap.size}</div>
          </article>
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Tenant Generation Breakdown</h2>
          </div>

          {usageBreakdown.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tenant Business</th>
                    <th>Total AI Generations</th>
                    <th>Mock Provider</th>
                    <th>Gemini API Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {usageBreakdown.map((row, idx) => (
                    <tr key={idx}>
                      <td><strong>{row.companyName}</strong></td>
                      <td>{row.totalGenerations}</td>
                      <td>{row.mockCount}</td>
                      <td>{row.geminiCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No generation events logged yet.</div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
