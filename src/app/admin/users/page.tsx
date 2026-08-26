import { DashboardShell } from "@/components/dashboard-shell";
import { requirePlatformAdmin } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignUserCompanyAction, inviteUserAction } from "../actions";
import type { Company, CompanyMembership, Profile } from "@/lib/database.types";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string; assigned?: string; error?: string }>;
}) {
  const params = await searchParams;
  await requirePlatformAdmin();
  const adminClient = createAdminClient();

  const [profilesRes, membershipsRes, companiesRes] = await Promise.all([
    adminClient.from("profiles").select("*").order("created_at", { ascending: false }),
    adminClient.from("company_members").select("*"),
    adminClient.from("companies").select("id,name,slug").order("name", { ascending: true }),
  ]);

  const profiles = (profilesRes.data as Profile[]) ?? [];
  const memberships = (membershipsRes.data as CompanyMembership[]) ?? [];
  const companies = (companiesRes.data as Company[]) ?? [];

  const companiesMap = new Map<string, Company>(companies.map((c) => [c.id, c]));

  // Map user IDs to their assigned companies
  const userMembershipsMap = new Map<string, Array<{ companyName: string; role: string; status: string }>>();
  for (const m of memberships) {
    const list = userMembershipsMap.get(m.user_id) ?? [];
    const company = companiesMap.get(m.company_id);
    list.push({
      companyName: company?.name ?? m.company_id,
      role: m.member_role,
      status: m.status,
    });
    userMembershipsMap.set(m.user_id, list);
  }

  return (
    <DashboardShell kind="admin" title="User Management" subtitle="Invite business owners via secure email auth and manage company memberships.">
      <div className="stack" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {params.invited && <div className="notice success">Invitation email sent successfully through Supabase Auth!</div>}
        {params.assigned && <div className="notice success">User assigned to company successfully.</div>}
        {params.error && <div className="notice error">Action failed: {params.error}</div>}

        {/* Invite User & Assign Forms */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Invite Form */}
          <section className="card">
            <div className="section-title">
              <h2>✉️ Invite Business Owner</h2>
            </div>
            <form action={inviteUserAction} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                Email Address
                <input type="email" name="email" placeholder="owner@clientbusiness.com" required style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }} />
              </label>

              <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                Assign to Company (Optional)
                <select name="companyId" defaultValue="" style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}>
                  <option value="">None (Unassigned)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </label>

              <button className="button primary" type="submit">
                Send Invitation Email
              </button>
            </form>
          </section>

          {/* Assign User to Company Form */}
          <section className="card">
            <div className="section-title">
              <h2>🔗 Assign User to Company</h2>
            </div>
            <form action={assignUserCompanyAction} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                Select User Profile
                <select name="userId" required style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}>
                  <option value="">Select User...</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || "No name"} ({p.id.slice(0, 8)}...) - {p.global_role}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                Select Target Company
                <select name="companyId" required style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}>
                  <option value="">Select Company...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                Membership Role
                <select name="memberRole" defaultValue="business_owner" style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}>
                  <option value="business_owner">Business Owner</option>
                  <option value="business_member">Business Member</option>
                </select>
              </label>

              <button className="button secondary" type="submit">
                Assign Membership
              </button>
            </form>
          </section>
        </div>

        {/* Profiles Table */}
        <section className="card">
          <div className="section-title">
            <h2>Registered Profiles ({profiles.length})</h2>
          </div>

          {profiles.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Full Name</th>
                    <th>Global Role</th>
                    <th>Company Memberships</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => {
                    const userMems = userMembershipsMap.get(p.id) ?? [];
                    return (
                      <tr key={p.id}>
                        <td><code>{p.id}</code></td>
                        <td><strong>{p.full_name ?? "Unset"}</strong></td>
                        <td><span className="status">{p.global_role}</span></td>
                        <td>
                          {userMems.length ? (
                            userMems.map((m, idx) => (
                              <span key={idx} style={{ display: "inline-block", background: "#edf2f7", padding: "0.2rem 0.4rem", borderRadius: "4px", fontSize: "0.8rem", marginRight: "0.25rem" }}>
                                {m.companyName} ({m.role})
                              </span>
                            ))
                          ) : (
                            <span style={{ color: "#a0aec0", fontStyle: "italic" }}>None</span>
                          )}
                        </td>
                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No profiles found.</div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
