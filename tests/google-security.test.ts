import { beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/google/crypto";
import { accountNameSchema, locationNameSchema, reviewNameSchema } from "@/lib/google/client";
import { statesMatch } from "@/lib/google/oauth";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  process.env.APP_URL = "http://localhost:3000";
  process.env.GOOGLE_API_MOCK = "true";
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("Google credential protection", () => {
  it("round-trips an encrypted token without embedding plaintext", () => {
    const encrypted = encryptSecret("refresh-token-secret");
    expect(encrypted).not.toContain("refresh-token-secret");
    expect(decryptSecret(encrypted)).toBe("refresh-token-secret");
  });
  it("rejects a tampered encrypted token", () => {
    const encrypted = encryptSecret("refresh-token-secret");
    const tampered = `${encrypted.slice(0,-2)}aa`;
    expect(() => decryptSecret(tampered)).toThrow();
  });
  it("compares OAuth state exactly", () => {
    expect(statesMatch("secure-state", "secure-state")).toBe(true);
    expect(statesMatch("secure-state", "other-state")).toBe(false);
    expect(statesMatch(null, "secure-state")).toBe(false);
  });
});

describe("Google resource boundaries", () => {
  it("accepts current account, location, and review resource names", () => {
    expect(accountNameSchema.parse("accounts/123-abc")).toBe("accounts/123-abc");
    expect(locationNameSchema.parse("locations/456_xyz")).toBe("locations/456_xyz");
    expect(reviewNameSchema.parse("accounts/123/locations/456/reviews/789")).toContain("reviews/789");
  });
  it("rejects cross-endpoint and injected paths", () => {
    expect(() => accountNameSchema.parse("accounts/123/locations/456")).toThrow();
    expect(() => reviewNameSchema.parse("https://example.com/reviews/1")).toThrow();
  });
});
