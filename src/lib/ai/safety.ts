import type { CompanySettings, ReviewDraft } from "@/lib/database.types";

export interface DraftSafetyCheckInput {
  star_rating: number;
  is_sensitive: boolean;
  confidence_score: number;
}

export interface SettingsSafetyInput {
  require_approval: boolean;
  auto_publish_eligible_replies: boolean;
  ai_enabled?: boolean;
  publishing_enabled?: boolean;
}

/**
 * Checks if AI generation is globally or company-level enabled
 */
export function isAiGenerationAllowed(settings?: { ai_enabled?: boolean }): boolean {
  if (process.env.AI_ENABLED === "false") {
    return false;
  }
  if (settings && settings.ai_enabled === false) {
    return false;
  }
  return true;
}

/**
 * Checks if publishing is globally or company-level enabled
 */
export function isPublishingAllowed(settings?: { publishing_enabled?: boolean }): boolean {
  if (process.env.PUBLISHING_ENABLED === "false") {
    return false;
  }
  if (settings && settings.publishing_enabled === false) {
    return false;
  }
  return true;
}

/**
 * Strict evaluation of auto-publish eligibility
 */
export function isReplyEligibleForAutoPublish(
  draft: DraftSafetyCheckInput | Pick<ReviewDraft, "star_rating" | "is_sensitive" | "confidence_score">,
  settings: SettingsSafetyInput | Pick<CompanySettings, "require_approval" | "auto_publish_eligible_replies" | "ai_enabled" | "publishing_enabled">
): boolean {
  // Circuit Breaker 1: Global and company-level kill switches
  if (!isAiGenerationAllowed(settings) || !isPublishingAllowed(settings)) {
    return false;
  }

  // Guardrail 1: If require_approval is TRUE, auto-publishing MUST NEVER happen
  if (settings.require_approval) {
    return false;
  }

  // Guardrail 2: Auto-publish setting must be explicitly enabled
  if (!settings.auto_publish_eligible_replies) {
    return false;
  }

  // Guardrail 3: Low-star reviews (1, 2, or 3 stars) are never auto-published
  if (draft.star_rating < 4) {
    return false;
  }

  // Guardrail 4: Sensitive reviews (food safety, legal threats, discrimination) require manual approval
  if (draft.is_sensitive) {
    return false;
  }

  // Guardrail 5: Low confidence score (< 0.80) requires manual approval
  if (draft.confidence_score < 0.80) {
    return false;
  }

  return true;
}
