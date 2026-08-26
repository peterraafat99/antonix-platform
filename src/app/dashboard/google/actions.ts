"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireBusinessOwnerCompany } from "@/lib/google/context";
import { requirePlatformAdmin } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { accountNameSchema, listGoogleLocations, reviewNameSchema, updateGoogleReviewReply } from "@/lib/google/client";
import { generateAiReviewDraft } from "@/lib/ai/provider";
import { isAiGenerationAllowed, isPublishingAllowed, isReplyEligibleForAutoPublish } from "@/lib/ai/safety";
import { rateLimits } from "@/lib/security/rate-limit";
import { sanitizeReviewText } from "@/lib/security/prompt-injection";
import { cancelScheduledReply, scheduleAutoPublishReply } from "@/lib/publishing/scheduler";
import { checkAndReservePublishQuota } from "@/lib/publishing/quota";
import type { AIExample, CompanyFAQ, CompanySettings, NotificationPreferences } from "@/lib/database.types";
import type { FullCompanySettings } from "@/lib/ai/types";

const uuidSchema = z.string().uuid();
const replySchema = z.string().trim().min(1).max(4096);
const confirmationSchema = z.literal("yes");

async function connectionForCompany(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("google_connections").select("id,company_id,token_expires_at,status").eq("company_id", companyId).single();
  if (!data || data.status !== "active") throw new Error("google_connection_required");
  return { supabase, connection: data };
}

export async function getOrCreateCompanySettings(companyId: string): Promise<CompanySettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("company_settings").select("*").eq("company_id", companyId).maybeSingle();
  if (data) return data as CompanySettings;

  const defaultSettings: CompanySettings = {
    company_id: companyId,
    require_approval: true,
    auto_publish_eligible_replies: false,
    daily_ai_reply_publish_cap: 20,
    timezone: "UTC",
    ai_enabled: true,
    publishing_enabled: true,
    tone: "friendly",
    reply_length: "medium",
    language: "auto",
    emoji_preference: "minimal",
    customer_name_preference: "first_name",
    company_description: "",
    custom_instructions: "",
    negative_review_policy: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: inserted } = await supabase.from("company_settings").upsert(defaultSettings).select().single();
  return (inserted as CompanySettings) ?? defaultSettings;
}

export async function getCompanyFullAISettings(companyId: string): Promise<FullCompanySettings> {
  const supabase = await createClient();
  const baseSettings = await getOrCreateCompanySettings(companyId);

  const [faqsRes, examplesRes] = await Promise.all([
    supabase.from("company_faqs").select("*").eq("company_id", companyId).order("created_at", { ascending: true }),
    supabase.from("ai_examples").select("*").eq("company_id", companyId).order("created_at", { ascending: true }),
  ]);

  return {
    ...baseSettings,
    faqs: (faqsRes.data as CompanyFAQ[]) ?? [],
    examples: (examplesRes.data as AIExample[]) ?? [],
  };
}

export async function getNotificationPreferences(companyId: string): Promise<NotificationPreferences> {
  const supabase = await createClient();
  const { data } = await supabase.from("notification_preferences").select("*").eq("company_id", companyId).maybeSingle();
  if (data) return data as NotificationPreferences;

  const defaultPrefs: NotificationPreferences = {
    company_id: companyId,
    email_on_negative: true,
    email_on_sensitive: true,
    notification_email: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data: inserted } = await supabase.from("notification_preferences").upsert(defaultPrefs).select().single();
  return (inserted as NotificationPreferences) ?? defaultPrefs;
}

export async function syncGoogleLocations(formData: FormData) {
  const { companyId } = await requireBusinessOwnerCompany();
  const accountName = accountNameSchema.parse(formData.get("accountName"));

  // Rate limit: max 1 sync per account/location per 5 minutes
  const limitCheck = rateLimits.googleSync(accountName);
  if (!limitCheck.allowed) {
    redirect(`/dashboard/google?error=rate_limited`);
  }

  const { supabase, connection } = await connectionForCompany(companyId);
  try {
    const locations = await listGoogleLocations(connection, accountName);
    if (locations.length) {
      const rows = locations.map((location) => ({
        company_id: companyId,
        google_connection_id: connection.id,
        google_account_name: accountName,
        google_location_name: location.name,
        title: location.title,
        store_code: location.storeCode ?? null,
      }));
      const { error } = await supabase.from("google_locations").upsert(rows, { onConflict: "company_id,google_account_name,google_location_name" });
      if (error) throw new Error("location_write_failed");
    }
    await supabase.from("google_connections").update({ last_synced_at: new Date().toISOString(), last_error_code: null }).eq("id", connection.id);

    // Audit log
    await supabase.from("audit_logs").insert({
      company_id: companyId,
      action: "google_locations_synced",
      details: { count: locations.length, accountName },
    });

    revalidatePath("/dashboard/google");
    redirect(`/dashboard/google?synced=${locations.length}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/dashboard/google?error=location_sync_failed");
  }
}

export async function setGoogleLocationSelection(formData: FormData) {
  const { companyId } = await requireBusinessOwnerCompany();
  const locationId = uuidSchema.parse(formData.get("locationId"));
  const selected = formData.get("selected") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("google_locations").update({ is_selected: selected }).eq("id", locationId).eq("company_id", companyId);
  if (error) redirect("/dashboard/google?error=location_update_failed");
  revalidatePath("/dashboard/google");
}

export async function publishManualGoogleReply(formData: FormData) {
  const { companyId } = await requireBusinessOwnerCompany();
  const locationId = uuidSchema.parse(formData.get("locationId"));
  const reviewName = reviewNameSchema.parse(formData.get("reviewName"));
  const comment = replySchema.parse(formData.get("comment"));
  confirmationSchema.parse(formData.get("confirm"));

  // Publishing rate limit: max 30 per company/hr
  const pubLimit = rateLimits.companyPublishing(companyId);
  if (!pubLimit.allowed) {
    redirect(`/dashboard/google/reviews?location=${locationId}&error=rate_limited`);
  }

  const supabase = await createClient();
  const { data: location } = await supabase.from("google_locations").select("id,company_id,google_connection_id,google_account_name,google_location_name,is_selected,is_enabled").eq("id", locationId).eq("company_id", companyId).single();
  if (!location || !location.is_selected || !location.is_enabled) redirect(`/dashboard/google/reviews?location=${locationId}&error=location_not_enabled`);
  const expectedPrefix = `${location.google_account_name}/${location.google_location_name}/reviews/`;
  if (!reviewName.startsWith(expectedPrefix)) redirect(`/dashboard/google/reviews?location=${locationId}&error=review_scope_mismatch`);
  const { data: connection } = await supabase.from("google_connections").select("id,token_expires_at,status").eq("id", location.google_connection_id).single();
  if (!connection || connection.status !== "active") redirect(`/dashboard/google/reviews?location=${locationId}&error=google_connection_required`);

  try {
    await updateGoogleReviewReply(connection, reviewName, comment);
    const nowIso = new Date().toISOString();
    await supabase.from("review_drafts").upsert(
      {
        company_id: companyId,
        google_location_id: location.id,
        google_review_name: reviewName,
        original_review_text: comment,
        generated_draft_text: comment,
        status: "published",
        approved_at: nowIso,
        published_at: nowIso,
      },
      { onConflict: "company_id,google_review_name" }
    );

    // Cancel any pending scheduled automated replies for this review
    await cancelScheduledReply(supabase, companyId, reviewName, "manual_reply_published");

    // Audit log
    await supabase.from("audit_logs").insert({
      company_id: companyId,
      action: "manual_reply_published",
      details: { reviewName, locationId },
    });

    revalidatePath("/dashboard/google/reviews");
    redirect(`/dashboard/google/reviews?location=${locationId}&published=true`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/dashboard/google/reviews?location=${locationId}&error=reply_publish_failed`);
  }
}

export async function generateAiDraftAction(formData: FormData) {
  const { companyId, context } = await requireBusinessOwnerCompany();
  const userId = context.userId;
  const locationId = uuidSchema.parse(formData.get("locationId"));
  const reviewName = reviewNameSchema.parse(formData.get("reviewName"));
  const rawOriginalText = String(formData.get("originalText") || "");
  const starRating = Math.max(0, Math.min(5, parseInt(String(formData.get("starRating") || "5"), 10)));
  const reviewerName = String(formData.get("reviewerName") || "");
  const businessTitle = String(formData.get("businessTitle") || "");

  // 1. Economic abuse & rate limiting: 1 req per review / 30s & max 50 drafts / company / day
  const genLimit = rateLimits.aiGeneration(reviewName);
  if (!genLimit.allowed) {
    redirect(`/dashboard/google/reviews?location=${locationId}&error=rate_limited`);
  }

  const dailyDraftLimit = rateLimits.companyDailyAiDrafts(companyId);
  if (!dailyDraftLimit.allowed) {
    redirect(`/dashboard/google/reviews?location=${locationId}&error=daily_generation_limit_reached`);
  }

  // 2. Prompt injection sanitization
  const { sanitizedText } = sanitizeReviewText(rawOriginalText);

  const supabase = await createClient();
  const fullSettings = await getCompanyFullAISettings(companyId);

  // Circuit breaker check
  if (!isAiGenerationAllowed(fullSettings)) {
    redirect(`/dashboard/google/reviews?location=${locationId}&error=ai_disabled`);
  }

  const draftOutput = await generateAiReviewDraft(
    {
      originalReviewText: sanitizedText,
      starRating,
      reviewerName,
      businessName: businessTitle,
    },
    fullSettings
  );

  // Record usage event
  await supabase.from("usage_events").insert({
    company_id: companyId,
    user_id: userId,
    event_type: "draft_generation",
    provider: draftOutput.provider,
    total_tokens: 150,
  });

  const isEligible = isReplyEligibleForAutoPublish(
    {
      star_rating: starRating,
      is_sensitive: draftOutput.isSensitive,
      confidence_score: draftOutput.confidenceScore,
    },
    fullSettings
  );

  const { data: savedDraft, error } = await supabase.from("review_drafts").upsert(
    {
      company_id: companyId,
      google_location_id: locationId,
      google_review_name: reviewName,
      original_review_text: rawOriginalText,
      star_rating: starRating,
      reviewer_name: reviewerName,
      generated_draft_text: draftOutput.generatedDraftText,
      status: "draft",
      confidence_score: draftOutput.confidenceScore,
      is_sensitive: draftOutput.isSensitive,
      approved_at: null,
      published_at: null,
    },
    { onConflict: "company_id,google_review_name" }
  ).select().single();

  if (error || !savedDraft) redirect(`/dashboard/google/reviews?location=${locationId}&error=draft_generation_failed`);

  // If eligible for auto-publishing, schedule it in the durable queue with 30-60 min delay
  if (isEligible) {
    try {
      await scheduleAutoPublishReply(supabase, {
        companyId,
        locationId,
        reviewName,
        draftId: savedDraft.id,
      });
    } catch (schedErr) {
      console.warn("Failed to enqueue delayed auto-publish:", schedErr);
    }
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    company_id: companyId,
    user_id: userId,
    action: "ai_draft_generated",
    details: { reviewName, starRating, confidence: draftOutput.confidenceScore, autoPublishEligible: isEligible },
  });

  revalidatePath("/dashboard/google/reviews");
  redirect(`/dashboard/google/reviews?location=${locationId}&draft_generated=true`);
}

export async function updateDraftTextAction(formData: FormData) {
  const { companyId, context } = await requireBusinessOwnerCompany();
  const locationId = uuidSchema.parse(formData.get("locationId"));
  const draftId = uuidSchema.parse(formData.get("draftId"));
  const comment = replySchema.parse(formData.get("comment"));

  const supabase = await createClient();
  const { data: draft, error } = await supabase
    .from("review_drafts")
    .update({ generated_draft_text: comment, updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error || !draft) redirect(`/dashboard/google/reviews?location=${locationId}&error=draft_update_failed`);

  // Cancel any scheduled auto-publish when draft is manually edited
  await cancelScheduledReply(supabase, companyId, draft.google_review_name, "draft_manually_edited");

  // Audit log
  await supabase.from("audit_logs").insert({
    company_id: companyId,
    user_id: context.userId,
    action: "draft_edited",
    details: { draftId },
  });

  revalidatePath("/dashboard/google/reviews");
  redirect(`/dashboard/google/reviews?location=${locationId}&draft_updated=true`);
}

export async function approveDraftAction(formData: FormData) {
  const { companyId, context } = await requireBusinessOwnerCompany();
  const locationId = uuidSchema.parse(formData.get("locationId"));
  const draftId = uuidSchema.parse(formData.get("draftId"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("review_drafts")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("company_id", companyId);

  if (error) redirect(`/dashboard/google/reviews?location=${locationId}&error=draft_approval_failed`);

  // Audit log
  await supabase.from("audit_logs").insert({
    company_id: companyId,
    user_id: context.userId,
    action: "draft_approved",
    details: { draftId },
  });

  revalidatePath("/dashboard/google/reviews");
  redirect(`/dashboard/google/reviews?location=${locationId}&draft_approved=true`);
}

export async function publishAiDraftAction(formData: FormData) {
  const { companyId, context } = await requireBusinessOwnerCompany();
  const locationId = uuidSchema.parse(formData.get("locationId"));
  const draftId = uuidSchema.parse(formData.get("draftId"));

  // 1. Publishing rate limit: max 30 per company / hour
  const pubLimit = rateLimits.companyPublishing(companyId);
  if (!pubLimit.allowed) {
    redirect(`/dashboard/google/reviews?location=${locationId}&error=rate_limited`);
  }

  const supabase = await createClient();

  // 2. Atomic Pilot Quota Check & Reservation (20 replies/day default)
  const quotaCheck = await checkAndReservePublishQuota(supabase, companyId);
  if (!quotaCheck.allowed) {
    // Mark draft as quota_exceeded
    await supabase.from("review_drafts").update({ status: "failed" }).eq("id", draftId).eq("company_id", companyId);
    redirect(`/dashboard/google/reviews?location=${locationId}&error=daily_quota_exceeded`);
  }

  const { data: draft } = await supabase.from("review_drafts").select("*").eq("id", draftId).eq("company_id", companyId).single();
  if (!draft) redirect(`/dashboard/google/reviews?location=${locationId}&error=draft_not_found`);

  const { data: location } = await supabase.from("google_locations").select("id,company_id,google_connection_id").eq("id", locationId).eq("company_id", companyId).single();
  if (!location) redirect(`/dashboard/google/reviews?location=${locationId}&error=location_not_enabled`);

  const { data: connection } = await supabase.from("google_connections").select("id,token_expires_at,status").eq("id", location.google_connection_id).single();
  if (!connection || connection.status !== "active") redirect(`/dashboard/google/reviews?location=${locationId}&error=google_connection_required`);

  try {
    await updateGoogleReviewReply(connection, draft.google_review_name, draft.generated_draft_text);
    const nowIso = new Date().toISOString();
    await supabase
      .from("review_drafts")
      .update({
        status: "published",
        published_at: nowIso,
        approved_at: draft.approved_at ?? nowIso,
      })
      .eq("id", draftId)
      .eq("company_id", companyId);

    // Cancel pending scheduled queue entry
    await cancelScheduledReply(supabase, companyId, draft.google_review_name, "published_manually");

    // Audit log
    await supabase.from("audit_logs").insert({
      company_id: companyId,
      user_id: context.userId,
      action: "ai_draft_published",
      details: { draftId, reviewName: draft.google_review_name },
    });

    revalidatePath("/dashboard/google/reviews");
    redirect(`/dashboard/google/reviews?location=${locationId}&published=true`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/dashboard/google/reviews?location=${locationId}&error=reply_publish_failed`);
  }
}

export async function updateCompanySettingsAction(formData: FormData) {
  const { companyId, context } = await requireBusinessOwnerCompany();
  const requireApproval = formData.get("requireApproval") === "true" || formData.get("requireApproval") === "on";
  const autoPublishEligible = formData.get("autoPublishEligible") === "true" || formData.get("autoPublishEligible") === "on";
  const tone = String(formData.get("tone") || "friendly");
  const replyLength = String(formData.get("replyLength") || "medium");
  const language = String(formData.get("language") || "auto");
  const emojiPreference = String(formData.get("emojiPreference") || "minimal");
  const customerNamePreference = String(formData.get("customerNamePreference") || "first_name");
  const companyDescription = String(formData.get("companyDescription") || "");
  const customInstructions = String(formData.get("customInstructions") || "");
  const negativeReviewPolicy = String(formData.get("negativeReviewPolicy") || "");

  const supabase = await createClient();
  const { error } = await supabase.from("company_settings").upsert(
    {
      company_id: companyId,
      require_approval: requireApproval,
      auto_publish_eligible_replies: autoPublishEligible,
      tone,
      reply_length: replyLength,
      language,
      emoji_preference: emojiPreference,
      customer_name_preference: customerNamePreference,
      company_description: companyDescription,
      custom_instructions: customInstructions,
      negative_review_policy: negativeReviewPolicy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  if (error) redirect("/dashboard/settings?error=settings_update_failed");

  // Audit log
  await supabase.from("audit_logs").insert({
    company_id: companyId,
    user_id: context.userId,
    action: "company_settings_updated",
    details: { requireApproval, autoPublishEligible, tone },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/google/reviews");
  redirect("/dashboard/settings?updated=true");
}

export async function requestQuotaIncreaseAction(formData: FormData) {
  const { companyId, context } = await requireBusinessOwnerCompany();
  const requestedCap = parseInt(String(formData.get("requestedCap") || "50"), 10);
  const reason = String(formData.get("reason") || "").trim();

  const supabase = await createClient();
  const { data: settings } = await supabase.from("company_settings").select("daily_ai_reply_publish_cap").eq("company_id", companyId).single();
  const currentCap = settings?.daily_ai_reply_publish_cap ?? 20;

  if (requestedCap <= currentCap) {
    redirect("/dashboard/settings?error=invalid_requested_cap");
  }

  const { error } = await supabase.from("quota_requests").insert({
    company_id: companyId,
    requested_by_user_id: context.userId,
    current_cap: currentCap,
    requested_cap: requestedCap,
    reason: reason || null,
    status: "pending",
  });

  if (error) redirect("/dashboard/settings?error=quota_request_failed");

  // Audit log
  await supabase.from("audit_logs").insert({
    company_id: companyId,
    user_id: context.userId,
    action: "quota_increase_requested",
    details: { currentCap, requestedCap, reason },
  });

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?quota_requested=true");
}

export async function addCompanyFaqAction(formData: FormData) {
  const { companyId } = await requireBusinessOwnerCompany();
  const question = String(formData.get("question") || "").trim();
  const answer = String(formData.get("answer") || "").trim();

  if (!question || !answer) redirect("/dashboard/settings?error=faq_missing_fields");

  const supabase = await createClient();
  const { error } = await supabase.from("company_faqs").insert({
    company_id: companyId,
    question,
    answer,
  });

  if (error) redirect("/dashboard/settings?error=faq_add_failed");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?faq_added=true");
}

export async function deleteCompanyFaqAction(formData: FormData) {
  const { companyId } = await requireBusinessOwnerCompany();
  const faqId = uuidSchema.parse(formData.get("faqId"));

  const supabase = await createClient();
  const { error } = await supabase.from("company_faqs").delete().eq("id", faqId).eq("company_id", companyId);

  if (error) redirect("/dashboard/settings?error=faq_delete_failed");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?faq_deleted=true");
}

export async function addAIExampleAction(formData: FormData) {
  const { companyId } = await requireBusinessOwnerCompany();
  const starRating = Math.max(1, Math.min(5, parseInt(String(formData.get("starRating") || "5"), 10)));
  const reviewText = String(formData.get("reviewText") || "").trim();
  const replyText = String(formData.get("replyText") || "").trim();

  if (!reviewText || !replyText) redirect("/dashboard/settings?error=example_missing_fields");

  const supabase = await createClient();
  const { error } = await supabase.from("ai_examples").insert({
    company_id: companyId,
    star_rating: starRating,
    review_text: reviewText,
    reply_text: replyText,
  });

  if (error) redirect("/dashboard/settings?error=example_add_failed");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?example_added=true");
}

export async function deleteAIExampleAction(formData: FormData) {
  const { companyId } = await requireBusinessOwnerCompany();
  const exampleId = uuidSchema.parse(formData.get("exampleId"));

  const supabase = await createClient();
  const { error } = await supabase.from("ai_examples").delete().eq("id", exampleId).eq("company_id", companyId);

  if (error) redirect("/dashboard/settings?error=example_delete_failed");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?example_deleted=true");
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  const { companyId } = await requireBusinessOwnerCompany();
  const emailOnNegative = formData.get("emailOnNegative") === "true" || formData.get("emailOnNegative") === "on";
  const emailOnSensitive = formData.get("emailOnSensitive") === "true" || formData.get("emailOnSensitive") === "on";
  const notificationEmail = String(formData.get("notificationEmail") || "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      company_id: companyId,
      email_on_negative: emailOnNegative,
      email_on_sensitive: emailOnSensitive,
      notification_email: notificationEmail,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  if (error) redirect("/dashboard/settings?error=notifications_update_failed");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?notifications_updated=true");
}

// ==============================================================================
// PLATFORM ADMIN ACTIONS: QUOTAS & EMERGENCY CIRCUIT BREAKERS
// ==============================================================================

export async function reviewQuotaRequestAction(formData: FormData) {
  const adminCtx = await requirePlatformAdmin();
  const requestId = uuidSchema.parse(formData.get("requestId"));
  const decision = formData.get("decision") === "approve" ? "approved" : "denied";
  const adminNotes = String(formData.get("adminNotes") || "").trim();

  const adminClient = createAdminClient();
  const { data: request, error: reqErr } = await adminClient.from("quota_requests").select("*").eq("id", requestId).single();
  if (reqErr || !request) redirect("/admin?error=request_not_found");

  // If approved, update company daily cap
  if (decision === "approved") {
    await adminClient
      .from("company_settings")
      .update({ daily_ai_reply_publish_cap: request.requested_cap, updated_at: new Date().toISOString() })
      .eq("company_id", request.company_id);
  }

  await adminClient
    .from("quota_requests")
    .update({
      status: decision,
      admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by_user_id: adminCtx.userId,
    })
    .eq("id", requestId);

  // Audit log
  await adminClient.from("audit_logs").insert({
    company_id: request.company_id,
    user_id: adminCtx.userId,
    action: `quota_request_${decision}`,
    details: { requestId, previousCap: request.current_cap, newCap: request.requested_cap, adminNotes },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/companies/${request.company_id}`);
  redirect(`/admin/companies/${request.company_id}?quota_reviewed=true`);
}

export async function toggleCompanyAiCircuitAction(formData: FormData) {
  const adminCtx = await requirePlatformAdmin();
  const companyId = uuidSchema.parse(formData.get("companyId"));
  const aiEnabled = formData.get("aiEnabled") === "true";
  const publishingEnabled = formData.get("publishingEnabled") === "true";

  const adminClient = createAdminClient();
  await adminClient
    .from("company_settings")
    .update({
      ai_enabled: aiEnabled,
      publishing_enabled: publishingEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId);

  // Audit log
  await adminClient.from("audit_logs").insert({
    company_id: companyId,
    user_id: adminCtx.userId,
    action: "company_ai_circuit_toggled",
    details: { aiEnabled, publishingEnabled },
  });

  revalidatePath(`/admin/companies/${companyId}`);
  redirect(`/admin/companies/${companyId}?circuit_updated=true`);
}
