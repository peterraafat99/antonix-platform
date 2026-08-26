import { z } from "zod";
import type { AIExample, CompanyFAQ, CompanySettings } from "@/lib/database.types";

export interface ReviewInput {
  originalReviewText: string;
  starRating: number;
  reviewerName?: string | null;
  businessName?: string | null;
}

export interface FullCompanySettings extends CompanySettings {
  faqs?: CompanyFAQ[];
  examples?: AIExample[];
}

export const generatedReviewReplySchema = z.object({
  reply: z.string().min(1),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  language: z.string().default("en"),
  riskLevel: z.enum(["low", "medium", "high"]),
  confidenceScore: z.number().min(0).max(1),
  requiresApproval: z.boolean(),
  reason: z.string().default(""),
  provider: z.enum(["mock", "gemini"]),
});

export type GeneratedReviewReply = z.infer<typeof generatedReviewReplySchema>;

export interface AIProvider {
  generateReviewReply(
    review: ReviewInput,
    settings?: Partial<FullCompanySettings>
  ): Promise<GeneratedReviewReply>;
}
