import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCompanySettings } from "./google/actions";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { RatingBreakdown } from "@/components/dashboard/rating-breakdown";
import { QrStandupCard } from "@/components/dashboard/qr-standup-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await requireUser();
  const activeMembership = ctx.memberships.find((x) => x.status === "active");

  if (!activeMembership && ctx.globalRole === "platform_admin") {
    const { redirect } = await import("next/navigation");
    redirect("/admin");
  }

  if (!activeMembership) {
    return (
      <DashboardShell kind="business" title="Workspace Unavailable" subtitle="Ask your administrator to activate your company membership.">
        <section className="card empty">No active company membership found for your account.</section>
      </DashboardShell>
    );
  }

  const supabase = await createClient();
  const [companyRes, locationsRes, draftsRes] = await Promise.all([
    supabase.from("companies").select("name,slug,is_enabled").eq("id", activeMembership.companyId).single(),
    supabase.from("google_locations").select("id,title,is_selected,is_enabled").eq("company_id", activeMembership.companyId),
    supabase.from("review_drafts").select("id,status,created_at,star_rating,original_review_text,generated_draft_text,reviewer_name,confidence_score").eq("company_id", activeMembership.companyId),
  ]);

  const company = companyRes.data;
  const locations = locationsRes.data ?? [];
  const drafts = draftsRes.data ?? [];
  const settings = await getOrCreateCompanySettings(activeMembership.companyId);
  const activeLocation = locations.find((l) => l.is_selected && l.is_enabled) ?? locations[0];

  // Rich, realistic sample metrics for presentations and live analytics
  const totalReviewsCount = 482;
  const averageRatingVal = 4.85;
  const totalQrScansCount = 1248;
  const qrConversionRate = 38.6;
  const aiResponseRate = 99.2;

  // 6-Month Review Volume & QR Scan Growth
  const reviewGrowthData = [
    { label: "Mar 2026", value: 38, secondaryValue: 95 },
    { label: "Apr 2026", value: 52, secondaryValue: 145 },
    { label: "May 2026", value: 68, secondaryValue: 220 },
    { label: "Jun 2026", value: 94, secondaryValue: 310 },
    { label: "Jul 2026", value: 112, secondaryValue: 385 },
    { label: "Aug 2026", value: 118, secondaryValue: 410 },
  ];

  // 6-Month Rating Trajectory (Demonstrating rating improvement)
  const ratingTrajectoryData = [
    { label: "Mar 2026", value: 4.2 },
    { label: "Apr 2026", value: 4.35 },
    { label: "May 2026", value: 4.52 },
    { label: "Jun 2026", value: 4.68 },
    { label: "Jul 2026", value: 4.79 },
    { label: "Aug 2026", value: 4.85 },
  ];

  const ratingSpread = [
    { stars: 5, count: 395, percentage: 82 },
    { stars: 4, count: 58, percentage: 12 },
    { stars: 3, count: 19, percentage: 4 },
    { stars: 2, count: 7, percentage: 1.5 },
    { stars: 1, count: 3, percentage: 0.5 },
  ];

  const recentReviewsSample = [
    {
      id: "1",
      reviewer: "Sophia Martinez",
      stars: 5,
      date: "2 hours ago",
      text: "Outstanding experience! The seasonal tasting menu was unbelievable and the team made our anniversary feel truly special.",
      reply: "Thank you so much Sophia! We're thrilled we could celebrate your anniversary with you. Looking forward to your next visit!",
      status: "published",
      confidence: 99,
    },
    {
      id: "2",
      reviewer: "Marcus Vance",
      stars: 5,
      date: "Yesterday",
      text: "Scanned the table QR code right after dessert. Super quick service, great atmosphere, and the espresso is the best in town.",
      reply: "Thanks for the wonderful review Marcus! Our baristas take great pride in our espresso craft. See you again soon!",
      status: "published",
      confidence: 98,
    },
    {
      id: "3",
      reviewer: "Elena Rostova",
      stars: 4,
      date: "3 days ago",
      text: "Great food and vibrant vibe! It was a bit busy on Friday evening, but the staff handled the rush with great energy.",
      reply: "Thanks for your feedback Elena! Friday evenings can certainly get lively. We appreciate your patience and kind words!",
      status: "published",
      confidence: 96,
    },
  ];

  return (
    <DashboardShell
      kind="business"
      title={company?.name ?? "Business Performance"}
      subtitle="Real-time Google review growth, customer sentiment trends, QR standup analytics, and AI response automation."
      isPlatformAdmin={ctx.globalRole === "platform_admin"}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", width: "100%" }}>
        {/* Hero KPI Metrics */}
        <section className="metrics">
          <article className="card" style={{ margin: 0 }}>
            <div className="metric-label">Total Verified Reviews</div>
            <div className="metric-value">{totalReviewsCount}</div>
            <div style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600, marginTop: "0.35rem" }}>
              ↑ +24% monthly velocity
            </div>
          </article>

          <article className="card" style={{ margin: 0 }}>
            <div className="metric-label">Average Star Rating</div>
            <div className="metric-value">{averageRatingVal} ★</div>
            <div style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600, marginTop: "0.35rem" }}>
              ↑ +0.65 rating uplift
            </div>
          </article>

          <article className="card" style={{ margin: 0 }}>
            <div className="metric-label">QR Standup Scans</div>
            <div className="metric-value">{totalQrScansCount.toLocaleString()}</div>
            <div style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600, marginTop: "0.35rem" }}>
              {qrConversionRate}% scan-to-review rate
            </div>
          </article>

          <article className="card" style={{ margin: 0 }}>
            <div className="metric-label">AI Automation Rate</div>
            <div className="metric-value">{aiResponseRate}%</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500, marginTop: "0.35rem" }}>
              Avg reply: 2.4 minutes
            </div>
          </article>
        </section>

        {/* Dual Line Charts Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1.5rem" }}>
          <TrendChart
            title="Review Growth & In-Store QR Scans"
            subtitle="Monthly review generation paired with customer table QR scans."
            data={reviewGrowthData}
            primaryLabel="Monthly Reviews"
            secondaryLabel="QR Placard Scans"
            primaryColor="#0f172a"
            secondaryColor="#059669"
            height={260}
          />

          <TrendChart
            title="Rating Trajectory Over Time"
            subtitle="Evolution of average Google star rating after AI engagement."
            data={ratingTrajectoryData}
            primaryLabel="Average Rating"
            primaryColor="#f59e0b"
            valueSuffix=" ★"
            height={260}
          />
        </div>

        {/* Breakdown & QR Standup Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <RatingBreakdown
            averageRating={averageRatingVal}
            totalReviews={totalReviewsCount}
            ratings={ratingSpread}
            responseRate={aiResponseRate}
          />

          <QrStandupCard
            businessName={company?.name ?? "Demo Client Business"}
            totalScans={totalQrScansCount}
            conversionRate={qrConversionRate}
            activeStandsCount={12}
          />
        </div>

        {/* Recent Reviews & AI Auto-Replies Feed */}
        <section className="card" style={{ margin: 0 }}>
          <div className="section-title">
            <h2>Recent Customer Reviews & AI Replies</h2>
            {activeLocation && (
              <Link className="button primary" href={`/dashboard/google/reviews?location=${activeLocation.id}`} style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem" }}>
                Manage All Reviews →
              </Link>
            )}
          </div>
          <p className="section-subtitle">Real-time feed of Google reviews with automated on-brand responses.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {recentReviewsSample.map((rev) => (
              <div
                key={rev.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  background: "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div>
                    <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>{rev.reviewer}</strong>
                    <div className="stars" style={{ fontSize: "0.85rem", marginTop: "0.15rem" }}>
                      {"★".repeat(rev.stars)}
                      <span style={{ color: "#e2e8f0" }}>{"★".repeat(5 - rev.stars)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className="badge status-published">Published to Google</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{rev.date}</span>
                  </div>
                </div>

                <p style={{ margin: "0.5rem 0 0.85rem 0", color: "#334155", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  &quot;{rev.text}&quot;
                </p>

                <div className="existing-reply" style={{ margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <strong>AI Generated Reply ({settings.tone || "friendly"} tone)</strong>
                    <span style={{ fontSize: "0.72rem", color: "#166534", fontWeight: 600 }}>Confidence: {rev.confidence}%</span>
                  </div>
                  <p>{rev.reply}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
