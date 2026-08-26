import Link from "next/link";
import { z } from "zod";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessOwnerCompany } from "@/lib/google/context";
import { listGoogleReviews } from "@/lib/google/client";
import {
  approveDraftAction,
  generateAiDraftAction,
  getOrCreateCompanySettings,
  publishAiDraftAction,
  publishManualGoogleReply,
  updateDraftTextAction,
} from "../actions";
import type { ReviewDraft } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const stars = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, STAR_RATING_UNSPECIFIED: 0 } as const;

const errors: Record<string, string> = {
  location_not_enabled: "This location is not enabled for review operations.",
  review_scope_mismatch: "The review did not belong to the selected company location.",
  google_connection_required: "Reconnect Google before publishing.",
  reply_publish_failed: "Google did not accept the reply. No local success was recorded.",
  draft_generation_failed: "Failed to generate AI reply draft.",
  draft_update_failed: "Failed to update draft text.",
  draft_approval_failed: "Failed to approve draft.",
  draft_not_found: "Requested draft was not found.",
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    location?: string;
    error?: string;
    published?: string;
    auto_published?: string;
    draft_generated?: string;
    draft_updated?: string;
    draft_approved?: string;
  }>;
}) {
  const params = await searchParams;
  const locationId = z.string().uuid().safeParse(params.location);
  const { companyId, context } = await requireBusinessOwnerCompany();

  if (!locationId.success) {
    return (
      <DashboardShell
        kind="business"
        title="Customer Reviews"
        subtitle="Select an active business location first."
        isPlatformAdmin={context.globalRole === "platform_admin"}
      >
        <section className="card empty">
          <Link className="button secondary" href="/dashboard/google">
            Return to Locations
          </Link>
        </section>
      </DashboardShell>
    );
  }

  const supabase = await createClient();
  const { data: location } = await supabase
    .from("google_locations")
    .select("id,title,google_account_name,google_location_name,google_connection_id,is_selected,is_enabled")
    .eq("id", locationId.data)
    .eq("company_id", companyId)
    .single();

  if (!location) {
    return (
      <DashboardShell
        kind="business"
        title="Customer Reviews"
        subtitle="The requested location is unavailable."
        isPlatformAdmin={context.globalRole === "platform_admin"}
      >
        <section className="card empty">Location not found in your company profile.</section>
      </DashboardShell>
    );
  }

  const settings = await getOrCreateCompanySettings(companyId);

  const { data: draftsData } = await supabase
    .from("review_drafts")
    .select("*")
    .eq("company_id", companyId)
    .eq("google_location_id", location.id);

  const draftsMap = new Map<string, ReviewDraft>((draftsData as ReviewDraft[])?.map((d) => [d.google_review_name, d]) ?? []);

  const { data: connection } = await supabase
    .from("google_connections")
    .select("id,token_expires_at,status")
    .eq("id", location.google_connection_id)
    .single();

  let reviewData: Awaited<ReturnType<typeof listGoogleReviews>> | null = null;
  let loadError = false;
  if (connection?.status === "active" && location.is_selected && location.is_enabled) {
    try {
      reviewData = await listGoogleReviews(connection, location.google_account_name, location.google_location_name);
    } catch {
      loadError = true;
    }
  }

  return (
    <DashboardShell
      kind="business"
      title={`${location.title} Reviews`}
      subtitle="Monitor customer feedback, generate on-brand AI responses, and manage review replies."
      isPlatformAdmin={context.globalRole === "platform_admin"}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <Link className="button outline" href="/dashboard/google" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>
            ← Back to Locations
          </Link>
        </div>

        {params.error && <div className="notice error" role="alert">{errors[params.error] ?? "Operation failed."}</div>}
        {params.published && params.auto_published && (
          <div className="notice success">Eligible 5-star response was auto-published to Google.</div>
        )}
        {params.published && !params.auto_published && (
          <div className="notice success">Reply published to Google successfully.</div>
        )}
        {params.draft_generated && <div className="notice success">AI draft generated and ready for review.</div>}
        {params.draft_updated && <div className="notice success">Draft response saved.</div>}
        {params.draft_approved && <div className="notice success">Draft approved for publishing.</div>}
        {loadError && (
          <div className="notice error" role="alert">
            Unable to fetch Google reviews. Please confirm account connection status.
          </div>
        )}

        {reviewData && (
          <section className="metrics">
            <article className="card" style={{ margin: 0 }}>
              <div className="metric-label">Total Reviews</div>
              <div className="metric-value">{reviewData.totalReviewCount ?? reviewData.reviews.length}</div>
            </article>
            <article className="card" style={{ margin: 0 }}>
              <div className="metric-label">Average Rating</div>
              <div className="metric-value">{reviewData.averageRating ? `${reviewData.averageRating.toFixed(1)} / 5.0` : "—"}</div>
            </article>
            <article className="card" style={{ margin: 0 }}>
              <div className="metric-label">Approval Policy</div>
              <div className="metric-value" style={{ fontSize: "1.1rem", marginTop: "0.6rem" }}>
                {settings.require_approval ? "Manual Approval Required" : "Auto-Publish Eligible"}
              </div>
            </article>
          </section>
        )}

        <section className="review-list">
          {reviewData?.reviews.length ? (
            reviewData.reviews.map((review) => {
              const draft = draftsMap.get(review.name);
              const numericRating = stars[review.starRating];
              const currentReplyText = review.reviewReply?.comment || (draft?.status === "published" ? draft.generated_draft_text : null);

              return (
                <article className="review-card" key={review.reviewId}>
                  <div className="review-meta">
                    <div>
                      <strong>{review.reviewer?.displayName ?? "Google Reviewer"}</strong>
                      <div className="stars" aria-label={`${numericRating} out of 5 stars`}>
                        {"★".repeat(numericRating)}
                        <span style={{ color: "#e2e8f0" }}>{"★".repeat(5 - numericRating)}</span>
                      </div>
                    </div>
                    <small style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {review.createTime ? new Date(review.createTime).toLocaleDateString() : ""}
                    </small>
                  </div>

                  <p className="review-body">{review.comment || "No written review comment provided."}</p>

                  {currentReplyText && (
                    <div className="existing-reply">
                      <strong>Published Response (Google)</strong>
                      <p>{currentReplyText}</p>
                    </div>
                  )}

                  {/* AI Response Assistant Container */}
                  <div className="ai-draft-card">
                    <div className="ai-draft-header">
                      <h4>AI Response Assistant</h4>
                      {draft && (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <span className={`badge status-${draft.status}`}>
                            {draft.status}
                          </span>
                          {draft.is_sensitive && (
                            <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
                              Flagged Sensitive
                            </span>
                          )}
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
                            Confidence: {Math.round(draft.confidence_score * 100)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {!draft ? (
                      <form action={generateAiDraftAction}>
                        <input type="hidden" name="locationId" value={location.id} />
                        <input type="hidden" name="reviewName" value={review.name} />
                        <input type="hidden" name="originalText" value={review.comment || ""} />
                        <input type="hidden" name="starRating" value={numericRating} />
                        <input type="hidden" name="reviewerName" value={review.reviewer?.displayName || ""} />
                        <input type="hidden" name="businessTitle" value={location.title} />
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 0.85rem 0" }}>
                          Generate an on-brand response tailored to this customer review using your workspace tone settings.
                        </p>
                        <button className="button primary" type="submit">
                          Generate AI Draft
                        </button>
                      </form>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <form action={updateDraftTextAction} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <input type="hidden" name="locationId" value={location.id} />
                          <input type="hidden" name="draftId" value={draft.id} />
                          <label style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                            Generated Draft (Editable)
                          </label>
                          <textarea
                            name="comment"
                            rows={3}
                            maxLength={4096}
                            required
                            defaultValue={draft.generated_draft_text}
                          />
                          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                            <button className="button secondary" type="submit" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}>
                              Save Draft Edits
                            </button>
                          </div>
                        </form>

                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid #e0e7ff" }}>
                          {draft.status === "draft" && (
                            <form action={approveDraftAction}>
                              <input type="hidden" name="locationId" value={location.id} />
                              <input type="hidden" name="draftId" value={draft.id} />
                              <button className="button primary" type="submit">
                                Approve Response
                              </button>
                            </form>
                          )}

                          {draft.status !== "published" && (
                            <form action={publishAiDraftAction}>
                              <input type="hidden" name="locationId" value={location.id} />
                              <input type="hidden" name="draftId" value={draft.id} />
                              <button className="button primary" type="submit" style={{ background: "#059669", borderColor: "#059669" }}>
                                Publish to Google
                              </button>
                            </form>
                          )}

                          <form action={generateAiDraftAction}>
                            <input type="hidden" name="locationId" value={location.id} />
                            <input type="hidden" name="reviewName" value={review.name} />
                            <input type="hidden" name="originalText" value={review.comment || ""} />
                            <input type="hidden" name="starRating" value={numericRating} />
                            <input type="hidden" name="reviewerName" value={review.reviewer?.displayName || ""} />
                            <input type="hidden" name="businessTitle" value={location.title} />
                            <button className="button outline" type="submit" style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}>
                              Regenerate
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Manual reply fallback form */}
                  <form className="reply-form" action={publishManualGoogleReply} style={{ marginTop: "1rem" }}>
                    <input type="hidden" name="locationId" value={location.id} />
                    <input type="hidden" name="reviewName" value={review.name} />
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Direct Manual Reply (Bypass AI)
                      </label>
                      <textarea
                        name="comment"
                        rows={2}
                        maxLength={4096}
                        required
                        defaultValue={review.reviewReply?.comment ?? ""}
                        placeholder="Write a custom manual response to publish directly to Google."
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                        <input type="checkbox" name="confirm" value="yes" required />
                        I confirm this response will be published publicly on Google.
                      </label>
                      <button className="button secondary" type="submit" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem" }}>
                        {review.reviewReply ? "Update Reply" : "Publish Manual Reply"}
                      </button>
                    </div>
                  </form>
                </article>
              );
            })
          ) : (
            <div className="card empty">
              {reviewData ? "No customer reviews found for this location." : "Reviews are unavailable until the location and connection are active."}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
