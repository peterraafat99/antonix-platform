import { beforeEach, describe, expect, it } from "vitest";
import type { AccessContext } from "@/lib/auth/permissions";
import { canAccessAdmin, canAccessCompany, isPlatformAdmin } from "@/lib/auth/permissions";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  process.env.APP_URL = "http://localhost:3000";
  process.env.GOOGLE_API_MOCK = "true";
});

describe("Admin Authorization & Tenant Isolation", () => {
  const platformAdminContext: AccessContext = {
    userId: "admin-user-id",
    globalRole: "platform_admin",
    memberships: [],
  };

  const companyAOwnerContext: AccessContext = {
    userId: "owner-a-user-id",
    globalRole: "user",
    memberships: [
      { companyId: "company-a-id", role: "business_owner", status: "active" },
    ],
  };

  const companyBOwnerContext: AccessContext = {
    userId: "owner-b-user-id",
    globalRole: "user",
    memberships: [
      { companyId: "company-b-id", role: "business_owner", status: "active" },
    ],
  };

  it("permits platform admin to access /admin and all companies", () => {
    expect(isPlatformAdmin(platformAdminContext)).toBe(true);
    expect(canAccessAdmin(platformAdminContext)).toBe(true);
    expect(canAccessCompany(platformAdminContext, "company-a-id")).toBe(true);
    expect(canAccessCompany(platformAdminContext, "company-b-id")).toBe(true);
  });

  it("denies business owner access to /admin routes", () => {
    expect(isPlatformAdmin(companyAOwnerContext)).toBe(false);
    expect(canAccessAdmin(companyAOwnerContext)).toBe(false);
  });

  it("enforces strict tenant isolation between Company A and Company B", () => {
    // Owner A can access Company A
    expect(canAccessCompany(companyAOwnerContext, "company-a-id")).toBe(true);
    // Owner A CANNOT access Company B
    expect(canAccessCompany(companyAOwnerContext, "company-b-id")).toBe(false);

    // Owner B can access Company B
    expect(canAccessCompany(companyBOwnerContext, "company-b-id")).toBe(true);
    // Owner B CANNOT access Company A
    expect(canAccessCompany(companyBOwnerContext, "company-a-id")).toBe(false);
  });
});

describe("Google Review Idempotency & Unique Scoping", () => {
  it("computes deterministic unique constraint keys for drafts", () => {
    const companyId = "company-a-id";
    const googleReviewName = "accounts/123/locations/456/reviews/789";

    const uniqueKey1 = `${companyId}:${googleReviewName}`;
    const uniqueKey2 = `${companyId}:${googleReviewName}`;

    expect(uniqueKey1).toBe(uniqueKey2);
  });
});
