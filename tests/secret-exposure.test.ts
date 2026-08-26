import { describe, expect, it } from "vitest";
import { getPublicEnv } from "../src/lib/env";

describe("Secret Exposure Prevention", () => {
  it("ensures public env parser strictly excludes server-only secrets", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key-12345";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret-service-role-key";
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
    process.env.GEMINI_API_KEY = "secret-gemini-key";

    const publicEnv = getPublicEnv();

    // Must contain public vars
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("public-anon-key-12345");

    // Must NOT contain server-only secrets
    expect((publicEnv as Record<string, unknown>).SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect((publicEnv as Record<string, unknown>).GOOGLE_TOKEN_ENCRYPTION_KEY).toBeUndefined();
    expect((publicEnv as Record<string, unknown>).GEMINI_API_KEY).toBeUndefined();
  });
});
