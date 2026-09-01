import type { AIExample, CompanyFAQ } from "@/lib/database.types";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth/server";
import {
  addAIExampleAction,
  addCompanyFaqAction,
  deleteAIExampleAction,
  deleteCompanyFaqAction,
  getCompanyFullAISettings,
  getNotificationPreferences,
  requestQuotaIncreaseAction,
  updateCompanySettingsAction,
  updateNotificationPreferencesAction,
} from "../google/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    updated?: string;
    faq_added?: string;
    faq_deleted?: string;
    example_added?: string;
    example_deleted?: string;
    notifications_updated?: string;
    quota_requested?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const userContext = await requireUser();
  const membership = userContext.memberships.find((x) => x.status === "active");

  const fullSettings = membership?.companyId ? await getCompanyFullAISettings(membership.companyId) : null;
  const notificationPrefs = membership?.companyId ? await getNotificationPreferences(membership.companyId) : null;

  return (
    <DashboardShell
      kind="business"
      title="Workspace Settings"
      subtitle="Configure response personality, brand guidelines, safety guardrails, and notification routing."
      isPlatformAdmin={userContext.globalRole === "platform_admin"}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {params.updated && <div className="notice success">AI brand settings saved successfully.</div>}
        {params.faq_added && <div className="notice success">Knowledge base FAQ added.</div>}
        {params.faq_deleted && <div className="notice success">Knowledge base FAQ removed.</div>}
        {params.example_added && <div className="notice success">Few-shot example response added.</div>}
        {params.example_deleted && <div className="notice success">Few-shot example response removed.</div>}
        {params.notifications_updated && <div className="notice success">Notification preferences updated.</div>}
        {params.quota_requested && <div className="notice success">Quota increase request submitted to platform administrators.</div>}
        {params.error && <div className="notice error">Operation failed: {params.error}</div>}

        {/* Tenant Information Card */}
        <section className="card">
          <div className="section-title">
            <h2>Tenant Profile</h2>
            <span className="status active">Active Account</span>
          </div>
          <p className="section-subtitle">Your organizational identity and permission level within this workspace.</p>

          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Assigned Role</label>
              <div style={{ marginTop: "0.25rem" }}>
                <strong>{membership?.role.replace("_", " ").toUpperCase() ?? "NO ACTIVE MEMBERSHIP"}</strong>
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Organization ID</label>
              <div style={{ marginTop: "0.25rem" }}>
                <code>{membership?.companyId ?? "Not assigned"}</code>
              </div>
            </div>
          </div>
        </section>

        {fullSettings && membership?.role === "business_owner" && (
          <>
            {/* Daily Pilot Quota & Capacity Management Card */}
            <section className="card">
              <div className="section-title">
                <h2>Daily AI Publishing Quota</h2>
                <span className="status active">{fullSettings.daily_ai_reply_publish_cap ?? 20} replies / day</span>
              </div>
              <p className="section-subtitle">
                Controlled daily allocation of automated, verified AI replies published to Google Reviews. (Resets at midnight in {fullSettings.timezone || "UTC"}).
              </p>

              <div style={{ background: "#f4f1e9", padding: "1rem", borderRadius: "8px", border: "1px solid var(--line)", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <strong style={{ fontSize: "0.85rem", color: "var(--ink)" }}>Pilot Protection Rule:</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Mock and manual replies bypass this limit</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.825rem", color: "var(--muted)", lineHeight: 1.5 }}>
                  To maintain quality control during our pilot onboarding, your business is capped at <strong>{fullSettings.daily_ai_reply_publish_cap ?? 20} AI-published replies per day</strong>. Once reached, additional reviews require manual approval or capacity expansion.
                </p>
              </div>

              {/* Request More AI Replies Form */}
              <form action={requestQuotaIncreaseAction} style={{ display: "grid", gridTemplateColumns: "150px 1fr auto", gap: "0.75rem", alignItems: "end", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.75rem" }}>Requested Cap</label>
                  <input
                    type="number"
                    name="requestedCap"
                    min={(fullSettings.daily_ai_reply_publish_cap ?? 20) + 1}
                    max={250}
                    defaultValue={(fullSettings.daily_ai_reply_publish_cap ?? 20) + 20}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.75rem" }}>Business Justification / Reason</label>
                  <input
                    type="text"
                    name="reason"
                    placeholder="e.g. Scaling table standups across 2 new dining rooms"
                  />
                </div>
                <button className="button primary" type="submit">
                  Request Higher Quota
                </button>
              </form>
            </section>

            {/* Form for AI Personality & Safety Settings */}
            <form action={updateCompanySettingsAction} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Voice & Tone Card */}
              <section className="card">
                <div className="section-title">
                  <h2>Voice & Tone Configuration</h2>
                </div>
                <p className="section-subtitle">
                  Define the communication style, reply length, and formatting rules used when generating review responses.
                </p>

                <div className="grid-3">
                  <div className="form-group">
                    <label htmlFor="tone">Tone of Voice</label>
                    <select id="tone" name="tone" defaultValue={fullSettings.tone}>
                      <option value="friendly">Friendly & Warm</option>
                      <option value="professional">Professional & Formal</option>
                      <option value="empathetic">Empathetic & Caring</option>
                      <option value="casual">Casual & Conversational</option>
                      <option value="enthusiastic">Enthusiastic & High-Energy</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="replyLength">Target Length</label>
                    <select id="replyLength" name="replyLength" defaultValue={fullSettings.reply_length}>
                      <option value="short">Short (1-2 sentences)</option>
                      <option value="medium">Medium (2-4 sentences)</option>
                      <option value="detailed">Detailed (Comprehensive)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="language">Output Language</label>
                    <select id="language" name="language" defaultValue={fullSettings.language}>
                      <option value="auto">Auto-detect (Match customer)</option>
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="emojiPreference">Emoji Frequency</label>
                    <select id="emojiPreference" name="emojiPreference" defaultValue={fullSettings.emoji_preference}>
                      <option value="none">Disabled (No emojis)</option>
                      <option value="minimal">Minimal (Max 1 tasteful emoji)</option>
                      <option value="generous">Generous (2-3 expressive emojis)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="customerNamePreference">Customer Addressing Format</label>
                    <select id="customerNamePreference" name="customerNamePreference" defaultValue={fullSettings.customer_name_preference}>
                      <option value="first_name">First Name (e.g. Hi Sarah)</option>
                      <option value="full_name">Full Name (e.g. Dear Sarah Jenkins)</option>
                      <option value="greeting_only">Generic Greeting (e.g. Hello there)</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Business Context & Directives */}
              <section className="card">
                <div className="section-title">
                  <h2>Brand Context & Custom Instructions</h2>
                </div>
                <p className="section-subtitle">
                  Provide background about your offerings and strict rules for how sensitive or negative feedback should be handled.
                </p>

                <div className="form-group">
                  <label htmlFor="companyDescription">Business Overview & Core Value Proposition</label>
                  <span className="helper-text">Summarize your specialty, atmosphere, signature offerings, or target clientele.</span>
                  <textarea
                    id="companyDescription"
                    name="companyDescription"
                    rows={2}
                    defaultValue={fullSettings.company_description}
                    placeholder="e.g. Artisanal specialty coffee roastery and bakery known for direct-trade single origin espresso and fresh pastries."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="customInstructions">Custom AI Directives & Guardrails</label>
                  <span className="helper-text">Specific instructions to follow in every response.</span>
                  <textarea
                    id="customInstructions"
                    name="customInstructions"
                    rows={2}
                    defaultValue={fullSettings.custom_instructions}
                    placeholder="e.g. Always thank guests for supporting local business. Mention our loyalty rewards program on 5-star reviews."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="negativeReviewPolicy">Negative Review Resolution Policy</label>
                  <span className="helper-text">Instructions for handling 1-3 star ratings.</span>
                  <textarea
                    id="negativeReviewPolicy"
                    name="negativeReviewPolicy"
                    rows={2}
                    defaultValue={fullSettings.negative_review_policy}
                    placeholder="e.g. Acknowledge the issue with empathy without admitting liability, and offer direct contact with our guest relations director."
                  />
                </div>
              </section>

              {/* Safety & Automation Policy */}
              <section className="card">
                <div className="section-title">
                  <h2>Automation & Safety Policy</h2>
                </div>
                <p className="section-subtitle">
                  Configure review approval thresholds and auto-publishing parameters.
                </p>

                <label className="toggle-card">
                  <input
                    type="checkbox"
                    name="requireApproval"
                    value="true"
                    defaultChecked={fullSettings.require_approval}
                  />
                  <div className="toggle-card-content">
                    <strong>Require Manual Owner Approval (Recommended)</strong>
                    <p>All AI generated draft responses must be explicitly reviewed and approved by a team member before publishing to Google.</p>
                  </div>
                </label>

                <label className="toggle-card">
                  <input
                    type="checkbox"
                    name="autoPublishEligible"
                    value="true"
                    defaultChecked={fullSettings.auto_publish_eligible_replies}
                  />
                  <div className="toggle-card-content">
                    <strong>Auto-Publish Eligible 5-Star Reviews (with 30 to 60 Min Delay)</strong>
                    <p>Automatically schedule publication after a randomized 30 to 60 min server-side delay for 4 to 5 star reviews with high confidence (≥80%) and zero sensitive flags.</p>
                  </div>
                </label>

                <div className="notice info" style={{ marginTop: "1rem", marginBottom: 0 }}>
                  <div>
                    <strong>Enforced Safety Policy:</strong> If manual approval is required, auto-publishing is suspended. 1 to 3 star ratings, legal complaints, or low confidence drafts are held for human review.
                  </div>
                </div>

                <div style={{ marginTop: "1.5rem" }}>
                  <button className="button primary" type="submit">
                    Save AI Configuration
                  </button>
                </div>
              </section>
            </form>

            {/* Knowledge Base & FAQs */}
            <section className="card">
              <div className="section-title">
                <h2>Knowledge Base & FAQs</h2>
              </div>
              <p className="section-subtitle">
                Add factual information about parking, dietary options, hours, and policies for the AI to reference accurately.
              </p>

              {fullSettings.faqs?.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "35%" }}>Customer Question</th>
                        <th>Standard Answer</th>
                        <th style={{ width: "80px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullSettings.faqs.map((faq: CompanyFAQ) => (
                        <tr key={faq.id}>
                          <td><strong>{faq.question}</strong></td>
                          <td>{faq.answer}</td>
                          <td style={{ textAlign: "right" }}>
                            <form action={deleteCompanyFaqAction}>
                              <input type="hidden" name="faqId" value={faq.id} />
                              <button className="button danger" type="submit" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}>
                                Delete
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">No FAQs added to the knowledge base yet.</div>
              )}

              <form action={addCompanyFaqAction} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.75rem", alignItems: "end", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.75rem" }}>Frequent Question</label>
                  <input type="text" name="question" placeholder="e.g. Do you have outdoor pet-friendly seating?" required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.75rem" }}>Accurate Answer</label>
                  <input type="text" name="answer" placeholder="e.g. Yes! Our heated patio welcomes dogs with water bowls available." required />
                </div>
                <button className="button secondary" type="submit">
                  Add FAQ
                </button>
              </form>
            </section>

            {/* Approved Few-Shot Examples */}
            <section className="card">
              <div className="section-title">
                <h2>Approved Response Examples</h2>
              </div>
              <p className="section-subtitle">
                Provide sample reviews and your ideal replies to train the AI on your exact tone and voice.
              </p>

              {fullSettings.examples?.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "90px" }}>Rating</th>
                        <th style={{ width: "40%" }}>Review Snippet</th>
                        <th>Approved Reply</th>
                        <th style={{ width: "80px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullSettings.examples.map((ex: AIExample) => (
                        <tr key={ex.id}>
                          <td>
                            <span className="stars" style={{ fontSize: "0.8rem" }}>
                              {"★".repeat(ex.star_rating)}
                            </span>
                          </td>
                          <td>&quot;{ex.review_text}&quot;</td>
                          <td>{ex.reply_text}</td>
                          <td style={{ textAlign: "right" }}>
                            <form action={deleteAIExampleAction}>
                              <input type="hidden" name="exampleId" value={ex.id} />
                              <button className="button danger" type="submit" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}>
                                Delete
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">No example replies configured yet.</div>
              )}

              <form action={addAIExampleAction} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr auto", gap: "0.75rem", alignItems: "end", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.75rem" }}>Star Rating</label>
                  <select name="starRating" defaultValue="5">
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.75rem" }}>Customer Review Snippet</label>
                  <input type="text" name="reviewText" placeholder="e.g. Delicious pastries and great latte art!" required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.75rem" }}>Ideal Response Text</label>
                  <input type="text" name="replyText" placeholder="e.g. Thanks so much! Our baristas love perfecting their pours." required />
                </div>
                <button className="button secondary" type="submit">
                  Add Example
                </button>
              </form>
            </section>

            {/* Notification Preferences */}
            {notificationPrefs && (
              <section className="card">
                <div className="section-title">
                  <h2>Notification & Alert Routing</h2>
                </div>
                <p className="section-subtitle">
                  Configure email alerts for negative reviews and sensitive customer complaints.
                </p>

                <form action={updateNotificationPreferencesAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <label className="toggle-card">
                    <input
                      type="checkbox"
                      name="emailOnNegative"
                      value="true"
                      defaultChecked={notificationPrefs.email_on_negative}
                    />
                    <div className="toggle-card-content">
                      <strong>Email Alert on Negative Reviews (1-3 Stars)</strong>
                      <p>Receive immediate alerts when customer ratings drop below 4 stars.</p>
                    </div>
                  </label>

                  <label className="toggle-card">
                    <input
                      type="checkbox"
                      name="emailOnSensitive"
                      value="true"
                      defaultChecked={notificationPrefs.email_on_sensitive}
                    />
                    <div className="toggle-card-content">
                      <strong>Immediate Alert on High-Risk / Sensitive Reviews</strong>
                      <p>Receive urgent notifications when reviews mention food safety, health inspections, or legal claims.</p>
                    </div>
                  </label>

                  <div className="form-group" style={{ maxWidth: "420px", marginTop: "0.5rem" }}>
                    <label htmlFor="notificationEmail">Alert Recipient Email</label>
                    <input
                      id="notificationEmail"
                      type="email"
                      name="notificationEmail"
                      defaultValue={notificationPrefs.notification_email ?? ""}
                      placeholder="owner@yourbusiness.com"
                    />
                  </div>

                  <button className="button primary" type="submit" style={{ alignSelf: "flex-start" }}>
                    Save Notification Preferences
                  </button>
                </form>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
