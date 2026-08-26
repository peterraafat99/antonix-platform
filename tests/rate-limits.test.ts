import { describe, expect, it } from "vitest";
import { checkRateLimit, rateLimits } from "../src/lib/security/rate-limit";

describe("Application-Level Rate Limiting", () => {
  it("enforces AI generation limit of 1 per review every 30 seconds", () => {
    const reviewId = "review-test-12345";
    const res1 = rateLimits.aiGeneration(reviewId);
    expect(res1.allowed).toBe(true);

    const res2 = rateLimits.aiGeneration(reviewId);
    expect(res2.allowed).toBe(false);
    expect(res2.errorMessage).toContain("Rate limit exceeded");
  });

  it("enforces daily draft generation cap of 50 drafts per company", () => {
    const companyId = "test-comp-rate-limit-50";

    // Simulate 50 drafts
    for (let i = 0; i < 50; i++) {
      const res = rateLimits.companyDailyAiDrafts(companyId);
      expect(res.allowed).toBe(true);
    }

    // 51st draft must be blocked
    const overflow = rateLimits.companyDailyAiDrafts(companyId);
    expect(overflow.allowed).toBe(false);
  });

  it("enforces generic sliding window limits cleanly", () => {
    const key = "custom-test-window";
    const max = 3;
    const windowSec = 10;

    expect(checkRateLimit(key, max, windowSec).allowed).toBe(true);
    expect(checkRateLimit(key, max, windowSec).allowed).toBe(true);
    expect(checkRateLimit(key, max, windowSec).allowed).toBe(true);
    expect(checkRateLimit(key, max, windowSec).allowed).toBe(false);
  });
});
