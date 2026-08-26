import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { requirePlatformAdmin } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requirePlatformAdmin();
  const adminClient = createAdminClient();

  const [companiesRes, draftsRes, usageRes, membersRes] = await Promise.all([
    adminClient.from("companies").select("id,is_enabled"),
    adminClient.from("review_drafts").select("id,status,star_rating"),
    adminClient.from("usage_events").select("id,created_at"),
    adminClient.from("company_members").select("id"),
  ]);

  const totalCompanies = companiesRes.data?.length ?? 0;
  const activeCompanies = companiesRes.data?.filter((c) => c.is_enabled).length ?? 0;
  const totalDrafts = draftsRes.data?.length ?? 0;
  const publishedDrafts = draftsRes.data?.filter((d) => d.status === "published").length ?? 0;
  const totalGenerations = usageRes.data?.length ?? 0;
  const totalUsers = membersRes.data?.length ?? 0;

  const pilotCapacity = 20;
  const pilotGenerationLimit = 2500;

  return (
    <DashboardShell kind="admin" title="Platform Overview" subtitle="Multi-tenant agency control panel for client onboarding and pilot management.">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
        {/* KPI Metrics */}
        <section className="metrics">
          <article className="card" style={{ margin: 0 }}>
            <div className="metric-label">Active Tenants</div>
            <div className="metric-value">{activeCompanies} / {totalCompanies}</div>
            <small style={{ color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>Pilot limit: {pilotCapacity} businesses</small>
          </article>

          <article className="card" style={{ margin: 0 }}>
            <div className="metric-label">AI Generations (This Month)</div>
            <div className="metric-value">{totalGenerations}</div>
            <small style={{ color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>Limit: {pilotGenerationLimit} / month</small>
          </article>

          <article className="card" style={{ margin: 0 }}>
            <div className="metric-label">Total Drafts Generated</div>
            <div className="metric-value">{totalDrafts}</div>
            <small style={{ color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>Published to Google: {publishedDrafts}</small>
          </article>

          <article className="card" style={{ margin: 0 }}>
            <div className="metric-label">Assigned Users</div>
            <div className="metric-value">{totalUsers}</div>
            <small style={{ color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>Active business owners</small>
          </article>
        </section>

        {/* Quick Actions Grid */}
        <section className="card" style={{ margin: 0 }}>
          <div className="section-title">
            <h2>Agency Quick Actions</h2>
          </div>
          <p className="section-subtitle">Jump directly to client tenant management, user provisioning, or review feeds.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
            <Link className="button primary" href="/admin/companies" style={{ padding: "0.75rem 1rem", justifyContent: "center" }}>
              Manage Companies
            </Link>
            <Link className="button secondary" href="/admin/users" style={{ padding: "0.75rem 1rem", justifyContent: "center" }}>
              Invite & Manage Users
            </Link>
            <Link className="button secondary" href="/admin/reviews" style={{ padding: "0.75rem 1rem", justifyContent: "center" }}>
              Review Feed Activity
            </Link>
            <Link className="button secondary" href="/admin/analytics" style={{ padding: "0.75rem 1rem", justifyContent: "center" }}>
              Platform Analytics
            </Link>
          </div>
        </section>

        {/* System Health */}
        <section className="card" style={{ margin: 0 }}>
          <div className="section-title">
            <h2>System Health & AI Providers</h2>
            <span className="status active">Operational</span>
          </div>
          <p className="section-subtitle">Real-time status of connected AI models and Google Business Profile bridge.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginTop: "1rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Google API Mode</label>
              <div style={{ marginTop: "0.25rem" }}>
                <code>GOOGLE_API_MOCK=true</code> (Mock Safe)
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>AI Provider</label>
              <div style={{ marginTop: "0.25rem" }}>
                <span className="chip" style={{ textTransform: "uppercase" }}>{process.env.AI_PROVIDER || "gemini"}</span>
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Primary Model</label>
              <div style={{ marginTop: "0.25rem" }}>
                <code>{process.env.GEMINI_PRIMARY_MODEL || "gemini-3.5-flash-lite"}</code>
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Fallback Model</label>
              <div style={{ marginTop: "0.25rem" }}>
                <code>{process.env.GEMINI_FALLBACK_MODEL || "gemma-4-31b-it"}</code>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
