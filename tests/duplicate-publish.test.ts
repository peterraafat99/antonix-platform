import { describe, expect, it } from "vitest";

describe("Idempotent Publishing & Duplicate Prevention", () => {
  it("prevents duplicate publishing using unique idempotency keys", () => {
    const publishedKeys = new Set<string>();

    function publishWithIdempotency(idempotencyKey: string, reviewName: string, replyText: string) {
      if (publishedKeys.has(idempotencyKey)) {
        return { status: "already_processed", reviewName, replyText };
      }
      publishedKeys.add(idempotencyKey);
      return { status: "published", reviewName, replyText };
    }

    const key = "idemp_comp1_review987_retry1";
    const res1 = publishWithIdempotency(key, "accounts/123/locations/456/reviews/987", "Thank you!");
    expect(res1.status).toBe("published");

    // Retrying with same idempotency key must not trigger duplicate publishing
    const res2 = publishWithIdempotency(key, "accounts/123/locations/456/reviews/987", "Thank you!");
    expect(res2.status).toBe("already_processed");
    expect(publishedKeys.size).toBe(1);
  });
});
