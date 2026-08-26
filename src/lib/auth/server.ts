import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AccessContext } from "./permissions";
import { canAccessAdmin, canAccessCompany } from "./permissions";
import { isSupabaseConfigured } from "@/lib/env";

export const getAccessContext = cache(async (): Promise<AccessContext | null> => {
  if (!isSupabaseConfigured()) return null;

  const sb = await createClient();
  const { data: { user }, error: userError } = await sb.auth.getUser();
  if (userError || !user) {
    console.error("Dashboard auth lookup failed", {
      code: userError?.code,
      status: userError?.status,
      message: userError?.message,
    });
    return null;
  }

  const [profileResult, membershipResult] = await Promise.all([
    sb.from("profiles").select("global_role").eq("id", user.id).maybeSingle(),
    sb.from("company_members").select("company_id,member_role,status").eq("user_id", user.id),
  ]);

  let globalRole = profileResult.data?.global_role;
  let memberRows = membershipResult.data;

  if (!globalRole || !memberRows || profileResult.error || membershipResult.error) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createAdminClient();
      const [adminProfile, adminMembers] = await Promise.all([
        adminClient.from("profiles").select("global_role").eq("id", user.id).maybeSingle(),
        adminClient.from("company_members").select("company_id,member_role,status").eq("user_id", user.id),
      ]);

      if (adminProfile.data) {
        globalRole = adminProfile.data.global_role;
      } else {
        // Auto-provision standard user profile for new auth user
        const { data: newProfile } = await adminClient
          .from("profiles")
          .insert({ id: user.id, global_role: "user" })
          .select()
          .single();
        globalRole = newProfile?.global_role ?? "user";
      }

      if (adminMembers.data) {
        memberRows = adminMembers.data;
      }
    } catch (adminErr) {
      console.error("Admin fallback lookup failed:", adminErr);
    }
  }

  if (!globalRole) {
    console.error("Dashboard access lookup failed", {
      profileCode: profileResult.error?.code,
      profileMessage: profileResult.error?.message,
      membershipCode: membershipResult.error?.code,
      membershipMessage: membershipResult.error?.message,
      profileFound: Boolean(profileResult.data),
    });
    return null;
  }

  return {
    userId: user.id,
    globalRole,
    memberships: (memberRows ?? []).map((membership) => ({
      companyId: membership.company_id,
      role: membership.member_role,
      status: membership.status,
    })),
  };
});

export async function requireUser() {
  const context = await getAccessContext();
  if (!context) redirect("/login?error=Session%20not%20available");
  return context;
}

export async function requirePlatformAdmin() {
  const context = await requireUser();
  if (!canAccessAdmin(context)) redirect("/dashboard");
  return context;
}

export async function requireCompanyAccess(id: string) {
  const context = await requireUser();
  if (!canAccessCompany(context, id)) redirect("/dashboard?error=forbidden");
  return context;
}
