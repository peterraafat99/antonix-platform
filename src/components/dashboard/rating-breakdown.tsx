export interface RatingCount {
  stars: number;
  count: number;
  percentage: number;
}

interface RatingBreakdownProps {
  averageRating: number;
  totalReviews: number;
  ratings: RatingCount[];
  responseRate: number;
}

export function RatingBreakdown({
  averageRating,
  totalReviews,
  ratings,
  responseRate,
}: RatingBreakdownProps) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--line)", padding: "1.5rem" }}>
      <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>Rating Distribution</h3>
      <p style={{ margin: "0.25rem 0 1.25rem 0", fontSize: "0.825rem", color: "var(--muted)" }}>Overall customer sentiment and rating spread.</p>

      <div style={{ display: "flex", alignItems: "center", gap: "2rem", marginBottom: "1.5rem", paddingBottom: "1.25rem", borderBottom: "1px solid var(--line)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.85rem", fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{averageRating.toFixed(1)}</div>
          <div style={{ color: "#f59e0b", letterSpacing: "0.15em", fontSize: "1.1rem", margin: "0.4rem 0" }}>★★★★★</div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>Based on {totalReviews} verified reviews</div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {ratings.map((r) => (
            <div key={r.stars} style={{ display: "grid", gridTemplateColumns: "45px 1fr 45px", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem" }}>
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>{r.stars} Star</span>
              <div style={{ height: "7px", background: "#edf2f7", borderRadius: "99px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${r.percentage}%`,
                    background: r.stars >= 4 ? "var(--accent)" : r.stars === 3 ? "#f59e0b" : "var(--danger)",
                    borderRadius: "99px",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <span style={{ textAlign: "right", color: "var(--muted)", fontWeight: 600 }}>{r.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--line)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
            AI Response Rate
          </div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--accent)", marginTop: "0.25rem" }}>
            {responseRate}%
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>Avg reply time: 2.4 mins</div>
        </div>

        <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--line)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
            Sentiment Health
          </div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--ink)", marginTop: "0.25rem" }}>
            94.8% Positive
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>+18% since QR standup launch</div>
        </div>
      </div>
    </div>
  );
}
