import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanySettings } from "../database.types";

export interface QuotaCheckResult {
  allowed: boolean;
  usedToday: number;
  dailyCap: number;
  remaining: number;
  isMock: boolean;
  errorMessage?: string;
}

/**
 * Check if today's daily pilot AI reply cap has been reached for a company.
 * Note: Mock mode (GOOGLE_API_MOCK=true) does NOT consume production daily quota.
 * Manual human replies do NOT consume the AI publishing quota.
 */
export async function checkAndReservePublishQuota(
  supabase: SupabaseClient,
  companyId: string,
  options: { isMock?: boolean; isManualReply?: boolean } = {}
): Promise<QuotaCheckResult> {
  const isMock = options.isMock ?? process.env.GOOGLE_API_MOCK === "true";
  const isManual = options.isManualReply ?? false;

  // Mock operations and manual replies do not consume production AI publish quota
  if (isMock || isManual) {
    return {
      allowed: true,
      usedToday: 0,
      dailyCap: 20,
      remaining: 20,
      isMock,
    };
  }

  // 1. Fetch company settings
  const { data: settings } = await supabase
    .from("company_settings")
    .select("daily_ai_reply_publish_cap,timezone,publishing_enabled")
    .eq("company_id", companyId)
    .single();

  const dailyCap = settings?.daily_ai_reply_publish_cap ?? 20;
  const timezone = settings?.timezone || "UTC";

  if (settings && settings.publishing_enabled === false) {
    return {
      allowed: false,
      usedToday: 0,
      dailyCap,
      remaining: 0,
      isMock: false,
      errorMessage: "AI publishing is currently disabled for this workspace.",
    };
  }

  // 2. Compute calendar day window in company timezone
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
  const startOfDay = new Date(`${todayStr}T00:00:00.000Z`).toISOString();
  const endOfDay = new Date(`${todayStr}T23:59:59.999Z`).toISOString();

  // 3. Count published AI review drafts for today
  const { count, error } = await supabase
    .from("review_drafts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "published")
    .gte("published_at", startOfDay)
    .lte("published_at", endOfDay);

  const usedToday = count ?? 0;

  if (error || usedToday >= dailyCap) {
    return {
      allowed: false,
      usedToday,
      dailyCap,
      remaining: 0,
      isMock: false,
      errorMessage: `Daily pilot limit of ${dailyCap} AI replies has been reached for today.`,
    };
  }

  return {
    allowed: true,
    usedToday,
    dailyCap,
    remaining: Math.max(0, dailyCap - usedToday - 1),
    isMock: false,
  };
}

/**
 * Get current quota usage summary for client and admin dashboards
 */
export async function getCompanyQuotaSummary(
  supabase: SupabaseClient,
  companyId: string
): Promise<{ usedToday: number; dailyCap: number; remaining: number; timezone: string; isCapReached: boolean }> {
  const { data: settings } = await supabase
    .from("company_settings")
    .select("daily_ai_reply_publish_cap,timezone")
    .eq("company_id", companyId)
    .maybeSingle();

  const dailyCap = settings?.daily_ai_reply_publish_cap ?? 20;
  const timezone = settings?.timezone || "UTC";

  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
  const startOfDay = new Date(`${todayStr}T00:00:00.000Z`).toISOString();
  const endOfDay = new Date(`${todayStr}T23:59:59.999Z`).toISOString();

  const { count } = await supabase
    .from("review_drafts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "published")
    .gte("published_at", startOfDay)
    .lte("published_at", endOfDay);

  const usedToday = count ?? 0;
  const remaining = Math.max(0, dailyCap - usedToday);

  return {
    usedToday,
    dailyCap,
    remaining,
    timezone,
    isCapReached: usedToday >= dailyCap,
  };
}
