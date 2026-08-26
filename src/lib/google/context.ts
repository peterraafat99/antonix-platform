import { requireUser } from "@/lib/auth/server";

export async function requireBusinessOwnerCompany() {
  const context = await requireUser();
  const membership = context.memberships.find((item) => item.status === "active" && item.role === "business_owner");
  if (!membership) throw new Error("business_owner_membership_required");
  return { context, companyId:membership.companyId };
}
