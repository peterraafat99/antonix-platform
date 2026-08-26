import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { requirePlatformAdmin } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Company, ReviewDraft } from "@/lib/database.types";

export default async function AdminReviewsPage() {
  await requirePlatformAdmin();
  const adminClient = createAdminClient();

  const [draftsRes, companiesRes] = await Promise.all([
    adminClient.from("review_drafts").select("*").order("created_at", { ascending: false }).limit(100),
    adminClient.from("companies").select("id,name,slug"),
  ]);

  const drafts = (draftsRes.data as ReviewDraft[]) ?? [];
  const companies = (companiesRes.data as Company[]) ?? [];
  const companiesMap = new Map<string, Company>(companies.map((c) => [c.id, c]));

  return (
    <DashboardShell kind="admin" title="Platform Reviews & Drafts" subtitle="Cross-tenant oversight of AI response drafts, approvals, and publications.">
      <div className="stack" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <section className="metrics">
          <article className="card">
            <div className="metric-label">Total Drafts</div>
            <div className="metric-value">{drafts.length}</div>
          </article>
          <article className="card">
            <div className="metric-label">Approved</div>
            <div className="metric-value">{drafts.filter((d) => d.status === "approved").length}</div>
          </article>
          <article className="card">
            <div className="metric-label">Published</div>
            <div className="metric-value">{drafts.filter((d) => d.status === "published").length}</div>
          </article>
          <article className="card">
            <div className="metric-label">Sensitive / Flagged</div>
            <div className="metric-value">{drafts.filter((d) => d.is_sensitive).length}</div>
          </article>
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Recent Review Draft Activity ({drafts.length})</h2>
          </div>

          {drafts.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Rating</th>
                    <th>Original Review</th>
                    <th>Generated AI Draft</th>
                    <th>Status</th>
                    <th>Confidence</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d) => {
                    const company = companiesMap.get(d.company_id);
                    return (
                      <tr key={d.id}>
                        <td>
                          {company ? (
                            <Link href={`/admin/companies/${company.id}`} style={{ fontWeight: "bold" }}>
                              {company.name}
                            </Link>
                          ) : (
                            <code>{d.company_id.slice(0, 8)}</code>
                          )}
                        </td>
                        <td>{"★".repeat(d.star_rating)}</td>
                        <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {d.original_review_text || "<No text>"}
                        </td>
                        <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {d.generated_draft_text}
                        </td>
                        <td>
                          <span className={`status status-${d.status}`}>{d.status}</span>
                          {d.is_sensitive && <small style={{ color: "red", display: "block" }}>⚠️ Sensitive</small>}
                        </td>
                        <td>{Math.round(d.confidence_score * 100)}%</td>
                        <td>{new Date(d.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No review drafts generated across any tenant yet.</div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
