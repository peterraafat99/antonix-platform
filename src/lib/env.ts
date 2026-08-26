import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const googleEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_TOKEN_ENCRYPTION_KEY: z.string().min(1),
  GOOGLE_API_MOCK: z.enum(["true", "false"]).default("false"),
}).superRefine((value, context) => {
  if (value.GOOGLE_API_MOCK === "false") {
    for (const key of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI"] as const) {
      if (!value[key]) context.addIssue({ code: "custom", path: [key], message: `${key} is required` });
    }
  }
  try {
    if (Buffer.from(value.GOOGLE_TOKEN_ENCRYPTION_KEY, "base64").length !== 32) {
      context.addIssue({ code: "custom", path: ["GOOGLE_TOKEN_ENCRYPTION_KEY"], message: "Must decode to exactly 32 bytes" });
    }
  } catch {
    context.addIssue({ code: "custom", path: ["GOOGLE_TOKEN_ENCRYPTION_KEY"], message: "Must be base64" });
  }
});

export type GoogleEnv = z.infer<typeof googleEnvSchema>;

export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

function googleEnvInput() {
  return {
    ...getPublicEnv(),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_URL: process.env.APP_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    GOOGLE_TOKEN_ENCRYPTION_KEY: process.env.GOOGLE_TOKEN_ENCRYPTION_KEY,
    GOOGLE_API_MOCK: process.env.GOOGLE_API_MOCK,
  };
}

export function getGoogleEnv(): GoogleEnv {
  return googleEnvSchema.parse(googleEnvInput());
}

export function isSupabaseConfigured() {
  return publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }).success;
}

export function isGoogleConfigured() {
  if (!isSupabaseConfigured()) return false;
  return googleEnvSchema.safeParse(googleEnvInput()).success;
}
