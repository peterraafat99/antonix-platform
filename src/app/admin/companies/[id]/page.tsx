import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { DashboardShell } from "@/components/dashboard-shell";
import { requirePlatformAdmin } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toggleCompanyEnabledAction, updateCompanyAISettingsAdminAction } from "../../actions";
import { reviewQuotaRequestAction, toggleCompanyAiCircuitAction } from "@/app/dashboard/google/actions";
import type { CompanyMembership, CompanySettings, GoogleLocation, Profile, QuotaRequest, ScheduledReviewReply } from "@/lib/database.types";

const uuidSchema = z.string().uuid();

export default async function AdminCompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; settings_updated?: string; quota_reviewed?: string; circuit_updated?: string; error?: string }>;
}) {
  const { id } = await params;
  const queryParams = await searchParams;
  const companyIdParsed = uuidSchema.safeParse(id);

  if (!companyIdParsed.success) {
    notFound();
  }

  const companyId = companyIdParsed.data;
  await requirePlatformAdmin();
  const adminClient = createAdminClient();

  const [companyRes, settingsRes, membersRes, locationsRes, quotaReqsRes, scheduledRes] = await Promise.all([
    adminClient.from("companies").select("*").eq("id", companyId).single(),
    adminClient.from("company_settings").select("*").eq("company_id", companyId).maybeSingle(),
    adminClient.from("company_members").select("id,company_id,user_id,member_role,status,created_at").eq("company_id", companyId),
    adminClient.from("google_locations").select("*").eq("company_id", companyId),
    adminClient.from("quota_requests").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    adminClient.from("scheduled_review_replies").select("*").eq("company_id", companyId).order("scheduled_for", { ascending: false }).limit(10),
  ]);

  if (!companyRes.data) {
    notFound();
  }

  const company = companyRes.data;
  const settings = settingsRes.data as CompanySettings | null;
  const members = (membersRes.data as CompanyMembership[]) ?? [];
  const locations = (locationsRes.data as GoogleLocation[]) ?? [];
  const quotaRequests = (quotaReqsRes.data as QuotaRequest[]) ?? [];
  const scheduledReplies = (scheduledRes.data as ScheduledReviewReply[]) ?? [];

  // Fetch profiles for members
  const memberUserIds = members.map((m) => m.user_id);
  const profilesRes = memberUserIds.length
    ? await adminClient.from("profiles").select("id,full_name,global_role").in("id", memberUserIds)
    : { data: [] };
  const profilesMap = new Map<string, Profile>((profilesRes.data as Profile[])?.map((p) => [p.id, p]) ?? []);

  return (
    <DashboardShell kind="admin" title={`${company.name}`} subtitle="Manage tenant configuration, AI voice rules, membership, quota allocation, and circuit breakers.">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <Link className="button outline" href="/admin/companies" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>
            ← Back to Companies
          </Link>
        </div>

        {queryParams.updated && <div className="notice success">Company status updated successfully.</div>}
        {queryParams.settings_updated && <div className="notice success">Tenant AI parameters saved.</div>}
        {queryParams.quota_reviewed && <div className="notice success">Quota increase request reviewed and updated.</div>}
        {queryParams.circuit_updated && <div className="notice success">Circuit breaker status updated.</div>}
        {queryParams.error && <div className="notice error">Action failed: {queryParams.error}</div>}

        {/* Company Overview & Emergency Circuit Breaker */}
        <section className="card">
          <div className="section-title">
            <h2>Tenant Profile & Circuit Breakers</h2>
            <span className={`status ${company.is_enabled ? "active" : "warning"}`}>
              {company.is_enabled ? "Active Tenant" : "Suspended"}
            </span>
          </div>
          <p className="section-subtitle">Emergency kill switches and account status controls.</p>

          <div className="grid-2" style={{ marginBottom: "1rem" }}>
            <div>
              <strong>Tenant Slug:</strong> <code>{company.slug}</code>
            </div>
            <div>
              <strong>Organization ID:</strong> <code>{company.id}</code>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
            <form action={toggleCompanyAiCircuitAction} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="aiEnabled" value={settings?.ai_enabled === false ? "true" : "false"} />
              <input type="hidden" name="publishingEnabled" value={settings?.publishing_enabled === false ? "false" : "true"} />
              <button className={`button ${settings?.ai_enabled === false ? "primary" : "secondary"}`} type="submit">
                {settings?.ai_enabled === false ? "Re-Enable AI Generation" : "Disable AI Generation (Circuit Breaker)"}
              </button>
            </form>

            <form action={toggleCompanyAiCircuitAction} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="aiEnabled" value={settings?.ai_enabled === false ? "false" : "true"} />
              <input type="hidden" name="publishingEnabled" value={settings?.publishing_enabled === false ? "true" : "false"} />
              <button className={`button ${settings?.publishing_enabled === false ? "primary" : "danger"}`} type="submit">
                {settings?.publishing_enabled === false ? "Re-Enable Publishing" : "Halt All Publishing (Kill Switch)"}
              </button>
            </form>
          </div>
        </section>

        {/* Quota Increase Requests */}
        <section className="card">
          <div className="section-title">
            <h2>Pilot Capacity & Quota Requests</h2>
            <span className="status active">Current Cap: {settings?.daily_ai_reply_publish_cap ?? 20} replies / day</span>
          </div>
          <p className="section-subtitle">Review customer requests for higher daily auto-publish limits.</p>

          {quotaRequests.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Current Cap</th>
                    <th>Requested Cap</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotaRequests.map((req) => (
                    <tr key={req.id}>
                      <td>{new Date(req.created_at).toLocaleDateString()}</td>
                      <td>{req.current_cap}</td>
                      <td><strong>{req.requested_cap}</strong></td>
                      <td>{req.reason || "None provided"}</td>
                      <td>
                        <span className={`status ${req.status === "approved" ? "active" : req.status === "pending" ? "warning" : "danger"}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        {req.status === "pending" ? (
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <form action={reviewQuotaRequestAction}>
                              <input type="hidden" name="requestId" value={req.id} />
                              <input type="hidden" name="decision" value="approve" />
                              <button className="button primary" type="submit" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                                Approve
                              </button>
                            </form>
                            <form action={reviewQuotaRequestAction}>
                              <input type="hidden" name="requestId" value={req.id} />
                              <input type="hidden" name="decision" value="deny" />
                              <button className="button danger" type="submit" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                                Deny
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No quota increase requests submitted for this tenant.</div>
          )}
        </section>

        {/* Scheduled Delayed Replies Queue */}
        <section className="card">
          <div className="section-title">
            <h2>Scheduled Replies Queue (30-60 Min Delays)</h2>
          </div>
          <p className="section-subtitle">Durable background queue for pending auto-published replies.</p>

          {scheduledReplies.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Review Name</th>
                    <th>Scheduled For</th>
                    <th>Status</th>
                    <th>Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledReplies.map((reply) => (
                    <tr key={reply.id}>
                      <td><code>{reply.google_review_name.split("/").slice(-1)[0]}</code></td>
                      <td>{new Date(reply.scheduled_for).toLocaleString()}</td>
                      <td><span className="status active">{reply.status}</span></td>
                      <td>{reply.attempt_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No scheduled replies pending in the queue.</div>
          )}
        </section>

        {/* Admin AI Settings Override */}
        {settings && (
          <section className="card">
            <div className="section-title">
              <h2>Tenant AI Parameters (Admin Override)</h2>
            </div>
            <p className="section-subtitle">Directly configure AI generation rules for this client.</p>

            <form action={updateCompanyAISettingsAdminAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <input type="hidden" name="companyId" value={company.id} />

              <label className="toggle-card">
                <input type="checkbox" name="requireApproval" value="true" defaultChecked={settings.require_approval} />
                <div className="toggle-card-content">
                  <strong>Require Manual Owner Approval</strong>
                  <p>Hold all generated drafts for review before publishing.</p>
                </div>
              </label>

              <label className="toggle-card">
                <input type="checkbox" name="autoPublishEligible" value="true" defaultChecked={settings.auto_publish_eligible_replies} />
                <div className="toggle-card-content">
                  <strong>Auto-Publish Eligible 5-Star Reviews</strong>
                  <p>Allow automated replies for high-confidence positive reviews.</p>
                </div>
              </label>

              <div className="grid-2">
                <div className="form-group">
                  <label>Tone</label>
                  <select name="tone" defaultValue={settings.tone}>
                    <option value="friendly">Friendly & Warm</option>
                    <option value="professional">Professional & Formal</option>
                    <option value="empathetic">Empathetic & Caring</option>
                    <option value="casual">Casual & Conversational</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Reply Length</label>
                  <select name="replyLength" defaultValue={settings.reply_length}>
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
              </div>

              <button className="button primary" type="submit" style={{ alignSelf: "flex-start" }}>
                Save Admin Overrides
              </button>
            </form>
          </section>
        )}

        {/* Assigned Users / Memberships */}
        <section className="card">
          <div className="section-title">
            <h2>Tenant Members ({members.length})</h2>
          </div>

          {members.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Full Name</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const profile = profilesMap.get(m.user_id);
                    return (
                      <tr key={m.id}>
                        <td><code>{m.user_id}</code></td>
                        <td>{profile?.full_name ?? "Pending Profile"}</td>
                        <td><strong>{m.member_role}</strong></td>
                        <td><span className="status active">{m.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No users assigned to this company yet.</div>
          )}
        </section>

        {/* Connected Google Locations */}
        <section className="card">
          <div className="section-title">
            <h2>Connected Google Locations ({locations.length})</h2>
          </div>

          {locations.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Account</th>
                    <th>Location Name</th>
                    <th>Selected</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc.id}>
                      <td><strong>{loc.title}</strong></td>
                      <td><code>{loc.google_account_name}</code></td>
                      <td><code>{loc.google_location_name}</code></td>
                      <td>{loc.is_selected ? "Active" : "Inactive"}</td>
                      <td><span className="status active">{loc.is_enabled ? "Enabled" : "Disabled"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No Google locations synced for this company.</div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
