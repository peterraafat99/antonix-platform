export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  errorMessage?: string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window store (compatible with Node / Cloudflare Workers memory scope)
const rateLimitStore = new Map<string, RateLimitRecord>();

function cleanupExpired() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check and increment rate limit for a specific key
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): RateLimitResult {
  cleanupExpired();
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetSeconds: windowSeconds,
    };
  }

  if (existing.count >= maxRequests) {
    const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
      errorMessage: `Rate limit exceeded. Please wait ${resetSeconds} seconds before retrying.`,
    };
  }

  existing.count += 1;
  const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetSeconds,
  };
}

/**
 * Rate limit helpers for specific operations
 */
export const rateLimits = {
  // AI generation: max 1 request per review every 30 seconds
  aiGeneration: (reviewName: string) =>
    checkRateLimit(`ai_gen:${reviewName}`, 1, 30),

  // AI regeneration: max 3 per review per hour
  aiRegeneration: (reviewName: string) =>
    checkRateLimit(`ai_regen:${reviewName}`, 3, 3600),

  // Initial draft quota: max 50 generated drafts per company per day
  companyDailyAiDrafts: (companyId: string) =>
    checkRateLimit(`ai_daily_drafts:${companyId}`, 50, 86400),

  // Google sync: max 1 sync per location every 5 minutes
  googleSync: (locationId: string) =>
    checkRateLimit(`google_sync:${locationId}`, 1, 300),

  // Publishing: max 30 replies per company per hour
  companyPublishing: (companyId: string) =>
    checkRateLimit(`publish_hourly:${companyId}`, 30, 3600),

  // Admin invitations: max 10 per admin per hour
  adminInvitations: (adminUserId: string) =>
    checkRateLimit(`admin_invites:${adminUserId}`, 10, 3600),

  // Login attempts: max 5 per IP / email per 15 minutes
  loginAttempt: (identifier: string) =>
    checkRateLimit(`login_attempt:${identifier}`, 5, 900),

  // Password reset attempts: max 3 per email per 15 minutes
  passwordReset: (email: string) =>
    checkRateLimit(`pw_reset:${email}`, 3, 900),
};
