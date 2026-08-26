import { beforeEach, describe, expect, it } from "vitest";
import { generateDeterministicMockDraft, getAIProvider } from "@/lib/ai/provider";
import { MockProvider } from "@/lib/ai/mock-provider";
import { isReplyEligibleForAutoPublish } from "@/lib/ai/safety";
import { generatedReviewReplySchema } from "@/lib/ai/types";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  process.env.APP_URL = "http://localhost:3000";
  process.env.GOOGLE_API_MOCK = "true";
  process.env.AI_PROVIDER = "mock";
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("AI Provider Abstraction & Factory", () => {
  it("returns MockProvider when AI_PROVIDER is mock or GOOGLE_API_MOCK is true", () => {
    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(MockProvider);
  });

  it("generates schema-validated output via MockProvider", async () => {
    const provider = new MockProvider();
    const result = await provider.generateReviewReply(
      {
        originalReviewText: "Awesome service and delicious espresso!",
        starRating: 5,
        reviewerName: "Elena",
        businessName: "Demo Coffee",
      },
      { tone: "friendly" }
    );

    // Validate with Zod schema
    const parsed = generatedReviewReplySchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.provider).toBe("mock");
    expect(result.confidenceScore).toBe(0.95);
    expect(result.reply).toContain("Hi Elena");
  });

  it("incorporates company FAQs into mock replies when matched", async () => {
    const provider = new MockProvider();
    const result = await provider.generateReviewReply(
      {
        originalReviewText: "Do you have wifi available?",
        starRating: 4,
        reviewerName: "Alex",
        businessName: "Demo Coffee",
      },
      {
        tone: "friendly",
        faqs: [
          {
            id: "faq-1",
            company_id: "c1",
            question: "wifi",
            answer: "Yes, fast free Wi-Fi is available for all guests!",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      }
    );

    expect(result.reply).toContain("fast free Wi-Fi is available");
  });
});

describe("Deterministic Mock AI Provider Helpers", () => {
  it("generates a positive, warm reply for a 5-star review", () => {
    const output = generateDeterministicMockDraft({
      originalReviewText: "Great coffee and fast service!",
      starRating: 5,
      reviewerName: "Maya",
      businessName: "Demo Coffee House",
    });

    expect(output.generatedDraftText).toContain("Hi Maya");
    expect(output.generatedDraftText).toContain("5-star review");
    expect(output.generatedDraftText).toContain("Demo Coffee House");
    expect(output.confidenceScore).toBe(0.95);
    expect(output.isSensitive).toBe(false);
  });

  it("flags sensitive keywords and lowers confidence score", () => {
    const output = generateDeterministicMockDraft({
      originalReviewText: "Got food poisoning after drinking the milk here!",
      starRating: 1,
      reviewerName: "Alex",
      businessName: "Demo Coffee House",
    });

    expect(output.isSensitive).toBe(true);
    expect(output.confidenceScore).toBe(0.5);
    expect(output.generatedDraftText).toContain("investigate and resolve");
  });
});

describe("Corrected Auto-Publish Safety Guardrails", () => {
  const defaultSettings = {
    require_approval: true,
    auto_publish_eligible_replies: false,
  };

  const requireApprovalEnabledSettings = {
    require_approval: true,
    auto_publish_eligible_replies: true,
  };

  const autoPublishActiveSettings = {
    require_approval: false,
    auto_publish_eligible_replies: true,
  };

  it("denies auto-publish by default when settings are default", () => {
    const draft = { star_rating: 5, is_sensitive: false, confidence_score: 0.95 };
    expect(isReplyEligibleForAutoPublish(draft, defaultSettings)).toBe(false);
  });

  it("STRICTLY DENIES auto-publish when require_approval is TRUE even if auto_publish_eligible_replies is enabled", () => {
    const draft = { star_rating: 5, is_sensitive: false, confidence_score: 0.95 };
    // CRITICAL: require_approval=true MUST block auto-publishing!
    expect(isReplyEligibleForAutoPublish(draft, requireApprovalEnabledSettings)).toBe(false);
  });

  it("allows auto-publish ONLY when require_approval is FALSE and auto_publish_eligible_replies is TRUE", () => {
    const draft = { star_rating: 5, is_sensitive: false, confidence_score: 0.95 };
    expect(isReplyEligibleForAutoPublish(draft, autoPublishActiveSettings)).toBe(true);
  });

  it("never auto-publishes low-star (1-3 star) reviews even if auto-publish is active", () => {
    const threeStarDraft = { star_rating: 3, is_sensitive: false, confidence_score: 0.9 };
    const oneStarDraft = { star_rating: 1, is_sensitive: false, confidence_score: 0.9 };

    expect(isReplyEligibleForAutoPublish(threeStarDraft, autoPublishActiveSettings)).toBe(false);
    expect(isReplyEligibleForAutoPublish(oneStarDraft, autoPublishActiveSettings)).toBe(false);
  });

  it("never auto-publishes sensitive reviews", () => {
    const sensitiveDraft = { star_rating: 5, is_sensitive: true, confidence_score: 0.95 };
    expect(isReplyEligibleForAutoPublish(sensitiveDraft, autoPublishActiveSettings)).toBe(false);
  });

  it("never auto-publishes low-confidence drafts (< 80%)", () => {
    const lowConfidenceDraft = { star_rating: 5, is_sensitive: false, confidence_score: 0.75 };
    expect(isReplyEligibleForAutoPublish(lowConfidenceDraft, autoPublishActiveSettings)).toBe(false);
  });
});
