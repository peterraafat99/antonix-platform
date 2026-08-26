import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { requirePlatformAdmin } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCompanyAction } from "../actions";

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  await requirePlatformAdmin();
  const adminClient = createAdminClient();

  const { data: companies } = await adminClient
    .from("companies")
    .select("id,name,slug,is_enabled,created_at")
    .order("created_at", { ascending: false });

  return (
    <DashboardShell kind="admin" title="Tenant Companies" subtitle="Manage all customer accounts and provision new tenants.">
      <div className="stack" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {params.error && <div className="notice error">Action failed: {params.error}</div>}

        {/* Create Company Section */}
        <section className="card">
          <div className="section-title">
            <h2>➕ Provision New Tenant</h2>
          </div>
          <form action={createCompanyAction} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", alignItems: "end", marginTop: "1rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
              Company Name
              <input type="text" name="name" placeholder="e.g. Apex Dental Care" required style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }} />
            </label>

            <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
              Slug (URL Identifier)
              <input type="text" name="slug" placeholder="e.g. apex-dental" required style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }} />
            </label>

            <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
              Owner Email (Optional Invite)
              <input type="email" name="ownerEmail" placeholder="owner@apexdental.com" style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }} />
            </label>

            <button className="button primary" type="submit" style={{ height: "40px" }}>
              Create Company
            </button>
          </form>
        </section>

        {/* Companies List */}
        <section className="card">
          <div className="section-title">
            <h2>Company Directory ({companies?.length ?? 0})</h2>
          </div>

          {companies?.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Slug</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/admin/companies/${c.id}`} style={{ fontWeight: "bold", textDecoration: "underline" }}>
                          {c.name}
                        </Link>
                      </td>
                      <td><code>{c.slug}</code></td>
                      <td>
                        <span className={`status ${c.is_enabled ? "success" : "warning"}`}>
                          {c.is_enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <Link className="button secondary" href={`/admin/companies/${c.id}`} style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}>
                          Manage & Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No companies registered yet. Provision the first company above.</div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
