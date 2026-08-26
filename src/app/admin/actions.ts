"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

const uuidSchema = z.string().uuid();
const companyNameSchema = z.string().trim().min(1).max(160);
const slugSchema = z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const emailSchema = z.string().trim().email();

export async function createCompanyAction(formData: FormData) {
  const adminContext = await requirePlatformAdmin();
  const name = companyNameSchema.parse(formData.get("name"));
  const slug = slugSchema.parse(formData.get("slug"));
  const ownerEmail = formData.get("ownerEmail") ? emailSchema.parse(formData.get("ownerEmail")) : null;

  const adminClient = createAdminClient();

  // 1. Create company
  const { data: company, error: companyError } = await adminClient
    .from("companies")
    .insert({ name, slug, is_enabled: true })
    .select()
    .single();

  if (companyError || !company) {
    redirect("/admin/companies?error=company_create_failed");
  }

  // 2. Initialize default company AI settings
  await adminClient.from("company_settings").insert({
    company_id: company.id,
    require_approval: true,
    auto_publish_eligible_replies: false,
    tone: "friendly",
    reply_length: "medium",
    language: "auto",
    emoji_preference: "minimal",
    customer_name_preference: "first_name",
    company_description: `${name} local business`,
  });

  // 3. Initialize notification preferences
  await adminClient.from("notification_preferences").insert({
    company_id: company.id,
    email_on_negative: true,
    email_on_sensitive: true,
    notification_email: ownerEmail ?? null,
  });

  // 4. Invite business owner via Supabase Auth email if email provided
  if (ownerEmail) {
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(ownerEmail);
    if (!inviteError && inviteData.user) {
      await adminClient.from("company_members").insert({
        company_id: company.id,
        user_id: inviteData.user.id,
        member_role: "business_owner",
        status: "invited",
      });
    }
  }

  // 5. Audit log
  await adminClient.from("audit_logs").insert({
    company_id: company.id,
    user_id: adminContext.userId,
    action: "create_company",
    details: { name, slug, ownerEmail },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/companies");
  redirect(`/admin/companies/${company.id}?created=true`);
}

export async function toggleCompanyEnabledAction(formData: FormData) {
  const adminContext = await requirePlatformAdmin();
  const companyId = uuidSchema.parse(formData.get("companyId"));
  const isEnabled = formData.get("isEnabled") === "true";

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("companies")
    .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .eq("id", companyId);

  if (error) redirect(`/admin/companies?error=toggle_failed`);

  await adminClient.from("audit_logs").insert({
    company_id: companyId,
    user_id: adminContext.userId,
    action: "toggle_company_status",
    details: { isEnabled },
  });

  revalidatePath("/admin/companies");
  revalidatePath(`/admin/companies/${companyId}`);
  redirect(`/admin/companies/${companyId}?updated=true`);
}

export async function inviteUserAction(formData: FormData) {
  const adminContext = await requirePlatformAdmin();
  const email = emailSchema.parse(formData.get("email"));
  const companyId = formData.get("companyId") ? uuidSchema.parse(formData.get("companyId")) : null;

  const adminClient = createAdminClient();
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);

  if (inviteError || !inviteData.user) {
    redirect("/admin/users?error=invite_failed");
  }

  if (companyId) {
    await adminClient.from("company_members").upsert(
      {
        company_id: companyId,
        user_id: inviteData.user.id,
        member_role: "business_owner",
        status: "invited",
      },
      { onConflict: "company_id,user_id" }
    );
  }

  await adminClient.from("audit_logs").insert({
    company_id: companyId,
    user_id: adminContext.userId,
    action: "invite_user",
    details: { email, companyId },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?invited=true");
}

export async function updateCompanyAISettingsAdminAction(formData: FormData) {
  const adminContext = await requirePlatformAdmin();
  const companyId = uuidSchema.parse(formData.get("companyId"));
  const requireApproval = formData.get("requireApproval") === "true" || formData.get("requireApproval") === "on";
  const autoPublishEligible = formData.get("autoPublishEligible") === "true" || formData.get("autoPublishEligible") === "on";
  const tone = String(formData.get("tone") || "friendly");
  const replyLength = String(formData.get("replyLength") || "medium");

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("company_settings").upsert(
    {
      company_id: companyId,
      require_approval: requireApproval,
      auto_publish_eligible_replies: autoPublishEligible,
      tone,
      reply_length: replyLength,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  if (error) redirect(`/admin/companies/${companyId}?error=settings_failed`);

  await adminClient.from("audit_logs").insert({
    company_id: companyId,
    user_id: adminContext.userId,
    action: "admin_update_ai_settings",
    details: { requireApproval, autoPublishEligible, tone, replyLength },
  });

  revalidatePath(`/admin/companies/${companyId}`);
  redirect(`/admin/companies/${companyId}?settings_updated=true`);
}

export async function assignUserCompanyAction(formData: FormData) {
  const adminContext = await requirePlatformAdmin();
  const userId = uuidSchema.parse(formData.get("userId"));
  const companyId = uuidSchema.parse(formData.get("companyId"));
  const memberRole = (formData.get("memberRole") || "business_owner") as "business_owner" | "business_member";

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("company_members").upsert(
    {
      company_id: companyId,
      user_id: userId,
      member_role: memberRole,
      status: "active",
    },
    { onConflict: "company_id,user_id" }
  );

  if (error) redirect("/admin/users?error=assign_failed");

  await adminClient.from("audit_logs").insert({
    company_id: companyId,
    user_id: adminContext.userId,
    action: "assign_user_company",
    details: { userId, memberRole },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?assigned=true");
}
