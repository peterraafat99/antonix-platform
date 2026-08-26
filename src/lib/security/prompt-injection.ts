/**
 * Prompt injection defense and input sanitization for untrusted customer reviews
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /system\s+prompt\s+override/i,
  /you\s+are\s+now\s+(in\s+debug\s+mode|a\s+different\s+ai|an\s+unrestricted)/i,
  /disregard\s+(all\s+)?(safety|rules|instructions)/i,
  /output\s+(the\s+)?(system\s+prompt|hidden\s+instructions|api\s+key)/i,
  /reveal\s+(the\s+)?(secret|internal|system\s+prompt)/i,
  /<\/?system>/i,
  /<\/?instruction>/i,
];

export interface SanitizedReviewInput {
  sanitizedText: string;
  isFlaggedInjection: boolean;
  truncated: boolean;
}

/**
 * Sanitize and bound untrusted review text before feeding to LLM
 */
export function sanitizeReviewText(rawText: string, maxLength = 2000): SanitizedReviewInput {
  if (!rawText || typeof rawText !== "string") {
    return { sanitizedText: "", isFlaggedInjection: false, truncated: false };
  }

  let text = rawText.trim();
  const truncated = text.length > maxLength;
  if (truncated) {
    text = text.slice(0, maxLength);
  }

  // Detect injection attempts
  const isFlaggedInjection = INJECTION_PATTERNS.some((pattern) => pattern.test(text));

  // Escape XML-like injection characters and strip null bytes
  const sanitizedText = text
    .replace(/\0/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return {
    sanitizedText,
    isFlaggedInjection,
    truncated,
  };
}

/**
 * Format safely inside XML boundaries
 */
export function formatUntrustedReviewContext(reviewText: string, reviewerName?: string | null): string {
  const { sanitizedText } = sanitizeReviewText(reviewText);
  const safeName = (reviewerName || "Customer")
    .replace(/[<>&]/g, "")
    .slice(0, 100);

  return `<customer_review author="${safeName}">
${sanitizedText}
</customer_review>`;
}
