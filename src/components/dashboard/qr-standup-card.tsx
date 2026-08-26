"use client";

import { useState } from "react";

interface QrStandupCardProps {
  businessName: string;
  totalScans: number;
  conversionRate: number;
  activeStandsCount: number;
  reviewUrl?: string;
}

export function QrStandupCard({
  businessName,
  totalScans,
  conversionRate,
  activeStandsCount,
  reviewUrl = "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
}: QrStandupCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(reviewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--line)", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>Table Standup & Countertop QR Cards</h3>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.825rem", color: "var(--muted)" }}>
            Track physical QR placard scans that route in-store customers directly to write a Google review.
          </p>
        </div>
        <span className="status active">Active Tracking</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: "1.5rem", alignItems: "center" }}>
        {/* QR Code Standup Placard Mockup */}
        <div
          style={{
            background: "linear-gradient(135deg, #071324 0%, #0b2546 100%)",
            color: "#ffffff",
            padding: "1rem",
            borderRadius: "10px",
            textAlign: "center",
            boxShadow: "0 6px 18px rgba(7, 19, 36, 0.25)",
            border: "1px solid rgba(0, 128, 255, 0.3)",
          }}
        >
          <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#60a5fa", marginBottom: "0.4rem", fontWeight: 800 }}>
            {businessName}
          </div>
          <div style={{ fontSize: "0.825rem", fontWeight: 700, marginBottom: "0.6rem" }}>
            Loved your visit?
          </div>

          {/* SVG Vector QR Code Visual */}
          <div style={{ background: "#ffffff", padding: "0.5rem", borderRadius: "6px", display: "inline-block" }}>
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
              {/* Corner squares */}
              <rect x="5" y="5" width="26" height="26" rx="3" fill="#071324" />
              <rect x="9" y="9" width="18" height="18" rx="2" fill="#ffffff" />
              <rect x="13" y="13" width="10" height="10" fill="#0080ff" />

              <rect x="69" y="5" width="26" height="26" rx="3" fill="#071324" />
              <rect x="73" y="9" width="18" height="18" rx="2" fill="#ffffff" />
              <rect x="77" y="13" width="10" height="10" fill="#0080ff" />

              <rect x="5" y="69" width="26" height="26" rx="3" fill="#071324" />
              <rect x="9" y="73" width="18" height="18" rx="2" fill="#ffffff" />
              <rect x="13" y="77" width="10" height="10" fill="#0080ff" />

              {/* Data pattern blocks */}
              <rect x="36" y="8" width="8" height="8" fill="#071324" />
              <rect x="48" y="8" width="14" height="8" fill="#071324" />
              <rect x="36" y="20" width="14" height="8" fill="#071324" />
              <rect x="8" y="36" width="8" height="14" fill="#071324" />
              <rect x="20" y="36" width="14" height="8" fill="#071324" />
              <rect x="38" y="38" width="24" height="24" rx="2" fill="#071324" />
              <rect x="42" y="42" width="16" height="16" fill="#ffffff" />
              <rect x="46" y="46" width="8" height="8" fill="#0080ff" />
              <rect x="68" y="38" width="12" height="12" fill="#071324" />
              <rect x="84" y="38" width="8" height="18" fill="#071324" />
              <rect x="68" y="54" width="14" height="12" fill="#071324" />
              <rect x="36" y="68" width="12" height="12" fill="#071324" />
              <rect x="52" y="68" width="12" height="8" fill="#071324" />
              <rect x="36" y="84" width="26" height="8" fill="#071324" />
              <rect x="68" y="72" width="24" height="20" fill="#071324" />
            </svg>
          </div>

          <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: "0.5rem" }}>
            Scan to Review on Google
          </div>
        </div>

        {/* QR Metrics & Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Total Scans</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--ink)", marginTop: "0.2rem" }}>{totalScans.toLocaleString()}</div>
            </div>

            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Scan-to-Review</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent)", marginTop: "0.2rem" }}>{conversionRate}%</div>
            </div>

            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Active Stands</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--ink)", marginTop: "0.2rem" }}>{activeStandsCount} Placed</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              className="button primary"
              type="button"
              onClick={() => window.print()}
              style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}
            >
              Print Standup Placards (PDF)
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={handleCopy}
              style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}
            >
              {copied ? "Link Copied!" : "Copy Review Link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
