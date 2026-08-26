import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generate a cryptographically secure random delay between minMinutes and maxMinutes (default 30 to 60 min)
 */
export function generateSecurePublishDelay(minMinutes = 30, maxMinutes = 60): number {
  const minSeconds = minMinutes * 60;
  const maxSeconds = maxMinutes * 60;
  const randomSeconds = crypto.randomInt(minSeconds, maxSeconds + 1);
  return randomSeconds;
}

/**
 * Compute the target ISO timestamp for a scheduled review reply.
 * Bases calculation on the review createTime when provided, or from now.
 */
export function computeScheduledTimestamp(
  reviewCreateTime?: string | null,
  minMinutes = 30,
  maxMinutes = 60
): string {
  const delaySeconds = generateSecurePublishDelay(minMinutes, maxMinutes);
  const now = Date.now();

  if (reviewCreateTime) {
    const reviewTime = new Date(reviewCreateTime).getTime();
    if (!isNaN(reviewTime)) {
      const targetTime = reviewTime + delaySeconds * 1000;
      // If the review is already older than the target window, schedule it for the next safe window (e.g. 5-15 min from now)
      if (targetTime <= now) {
        const nextSafeDelaySeconds = crypto.randomInt(5 * 60, 15 * 60);
        return new Date(now + nextSafeDelaySeconds * 1000).toISOString();
      }
      return new Date(targetTime).toISOString();
    }
  }

  return new Date(now + delaySeconds * 1000).toISOString();
}

/**
 * Schedule an eligible auto-publish reply in the durable queue
 */
export async function scheduleAutoPublishReply(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    locationId: string;
    reviewName: string;
    draftId: string;
    reviewCreateTime?: string | null;
  }
) {
  const scheduledFor = computeScheduledTimestamp(params.reviewCreateTime);
  const idempotencyKey = `auto_pub_${params.companyId}_${params.reviewName}_${Date.now()}`;

  const { data, error } = await supabase
    .from("scheduled_review_replies")
    .upsert(
      {
        company_id: params.companyId,
        google_location_id: params.locationId,
        google_review_name: params.reviewName,
        draft_id: params.draftId,
        scheduled_for: scheduledFor,
        status: "scheduled",
        attempt_count: 0,
        idempotency_key: idempotencyKey,
      },
      { onConflict: "idempotency_key" }
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to schedule auto-publish reply:", error);
    throw error;
  }

  return data;
}

/**
 * Cancel pending scheduled replies if manual edits occur or auto-publish is disabled
 */
export async function cancelScheduledReply(
  supabase: SupabaseClient,
  companyId: string,
  reviewName: string,
  reason = "cancelled_by_user"
) {
  const { error } = await supabase
    .from("scheduled_review_replies")
    .update({
      status: "cancelled",
      failure_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("google_review_name", reviewName)
    .eq("status", "scheduled");

  if (error) {
    console.warn("Failed to cancel scheduled reply:", error);
  }
}
