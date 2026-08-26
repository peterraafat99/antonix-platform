import type { AIProvider, FullCompanySettings, GeneratedReviewReply, ReviewInput } from "./types";
import { generatedReviewReplySchema } from "./types";

const SENSITIVE_KEYWORDS = [
  "poisoning",
  "food poisoning",
  "sick",
  "hospital",
  "sue",
  "lawsuit",
  "lawyer",
  "illegal",
  "racist",
  "racism",
  "harassment",
  "health inspector",
  "scam",
  "fraud",
  "police",
  "stole",
  "theft",
];

export class MockProvider implements AIProvider {
  async generateReviewReply(
    review: ReviewInput,
    settings?: Partial<FullCompanySettings>
  ): Promise<GeneratedReviewReply> {
    const textLower = (review.originalReviewText || "").toLowerCase();
    const reviewer = review.reviewerName?.trim() || "valuable customer";
    const business = review.businessName?.trim() || settings?.company_description || "our business";
    const rating = Math.max(0, Math.min(5, review.starRating));
    const tone = settings?.tone || "friendly";

    const isSensitive = SENSITIVE_KEYWORDS.some((kw) => textLower.includes(kw));

    let confidenceScore = 0.95;
    let riskLevel: "low" | "medium" | "high" = "low";
    let sentiment: "positive" | "neutral" | "negative" = "positive";
    let requiresApproval = false;
    let reason = "High confidence mock response";
    let draftText = "";

    if (isSensitive) {
      confidenceScore = 0.50;
      riskLevel = "high";
      sentiment = "negative";
      requiresApproval = true;
      reason = "Contains sensitive or high-risk content keywords";
      draftText = `Hi ${reviewer}, thank you for reaching out to ${business}. We take concerns like this very seriously. Please contact our management team directly so we can immediately investigate and resolve this matter.`;
    } else if (rating >= 4) {
      confidenceScore = rating === 5 ? 0.95 : 0.90;
      sentiment = "positive";
      riskLevel = "low";
      const tonePrefix = tone === "formal" ? "Dear" : "Hi";
      draftText = `${tonePrefix} ${reviewer}, thank you so much for the ${rating}-star review! We're thrilled you had such a great experience at ${business} and we look forward to serving you again soon!`;
    } else if (rating === 3) {
      confidenceScore = 0.85;
      sentiment = "neutral";
      riskLevel = "medium";
      requiresApproval = true;
      reason = "3-star moderate rating requires review";
      draftText = `Hi ${reviewer}, thank you for sharing your feedback about ${business}. We appreciate your positive notes and are actively working on improvements for your next visit.`;
    } else {
      confidenceScore = 0.70;
      sentiment = "negative";
      riskLevel = "high";
      requiresApproval = true;
      reason = "Low rating (1-2 stars) requires manual approval";
      draftText = `Hi ${reviewer}, thank you for your review. We apologize that your visit to ${business} fell short of your expectations. We would love the opportunity to learn more and make things right.`;
    }

    if (settings?.faqs?.length) {
      const matchedFaq = settings.faqs.find((faq) =>
        textLower.includes(faq.question.toLowerCase())
      );
      if (matchedFaq) {
        draftText += ` Regarding your question: ${matchedFaq.answer}`;
      }
    }

    const rawOutput = {
      reply: draftText,
      sentiment,
      language: settings?.language === "auto" || !settings?.language ? "en" : settings.language,
      riskLevel,
      confidenceScore,
      requiresApproval,
      reason,
      provider: "mock" as const,
    };

    return generatedReviewReplySchema.parse(rawOutput);
  }
}
