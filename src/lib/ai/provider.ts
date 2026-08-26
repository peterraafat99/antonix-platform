import { getGoogleEnv } from "@/lib/env";
import type { AIProvider, FullCompanySettings, GeneratedReviewReply, ReviewInput } from "./types";
import { MockProvider } from "./mock-provider";
import { GeminiProvider } from "./gemini-provider";

export type { ReviewInput, FullCompanySettings, GeneratedReviewReply, AIProvider };

export interface GenerateDraftInput {
  originalReviewText: string;
  starRating: number;
  reviewerName?: string | null;
  businessName?: string | null;
}

export interface GenerateDraftOutput {
  generatedDraftText: string;
  confidenceScore: number;
  isSensitive: boolean;
  provider: "mock" | "gemini";
}

let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  const providerEnv = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY;
  const isMockMode = providerEnv === "mock" || !geminiKey;

  if (isMockMode) {
    return new MockProvider();
  }

  if (!providerInstance || !(providerInstance instanceof GeminiProvider)) {
    providerInstance = new GeminiProvider();
  }

  return providerInstance;
}

export function generateDeterministicMockDraft(input: GenerateDraftInput): GenerateDraftOutput {
  // Synchronous convenience wrapper for tests
  const reviewer = input.reviewerName?.trim() || "valuable customer";
  const business = input.businessName?.trim() || "our business";
  const rating = Math.max(0, Math.min(5, input.starRating));
  const textLower = (input.originalReviewText || "").toLowerCase();
  const SENSITIVE = ["poisoning", "food poisoning", "sick", "hospital", "sue", "lawsuit", "lawyer", "illegal", "racist", "racism", "harassment", "health inspector", "scam", "fraud", "police", "stole", "theft"];
  const isSensitive = SENSITIVE.some((kw) => textLower.includes(kw));

  let confidenceScore = 0.95;
  let draftText = "";

  if (isSensitive) {
    confidenceScore = 0.50;
    draftText = `Hi ${reviewer}, thank you for reaching out to ${business}. We take concerns like this very seriously. Please contact our management team directly so we can immediately investigate and resolve this matter.`;
  } else if (rating >= 5) {
    confidenceScore = 0.95;
    draftText = `Hi ${reviewer}, thank you so much for the 5-star review! We're thrilled you had such a great experience at ${business} and we look forward to serving you again soon!`;
  } else if (rating === 4) {
    confidenceScore = 0.90;
    draftText = `Hi ${reviewer}, thank you for the 4-star review! We really appreciate your feedback and look forward to welcoming you back to ${business}.`;
  } else if (rating === 3) {
    confidenceScore = 0.85;
    draftText = `Hi ${reviewer}, thank you for sharing your feedback about ${business}. We appreciate your positive notes and are actively working on improvements for your next visit.`;
  } else {
    confidenceScore = 0.70;
    draftText = `Hi ${reviewer}, thank you for your review. We apologize that your visit to ${business} fell short of your expectations. We would love the opportunity to learn more and make things right.`;
  }

  return {
    generatedDraftText: draftText,
    confidenceScore,
    isSensitive,
    provider: "mock",
  };
}

export async function generateAiReviewDraft(
  input: GenerateDraftInput,
  settings?: Partial<FullCompanySettings>
): Promise<GenerateDraftOutput> {
  const provider = getAIProvider();
  const result = await provider.generateReviewReply(
    {
      originalReviewText: input.originalReviewText,
      starRating: input.starRating,
      reviewerName: input.reviewerName,
      businessName: input.businessName,
    },
    settings
  );

  return {
    generatedDraftText: result.reply,
    confidenceScore: result.confidenceScore,
    isSensitive: result.riskLevel === "high" || result.requiresApproval,
    provider: result.provider,
  };
}
