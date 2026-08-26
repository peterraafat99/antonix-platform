"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function login(data: FormData) {
  if (!isSupabaseConfigured()) redirect("/login?error=Supabase%20is%20not%20configured");

  const parsed = schema.safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/login?error=Enter%20valid%20credentials");

  const sb = await createClient();
  const { data: signedIn, error: signInError } = await sb.auth.signInWithPassword(parsed.data);
  if (signInError || !signedIn.user) {
    console.error("Login failed", {
      code: signInError?.code,
      status: signInError?.status,
      message: signInError?.message,
    });
    redirect("/login?error=Sign%20in%20failed");
  }

  const { data: profile, error: profileError } = await sb
    .from("profiles")
    .select("global_role")
    .eq("id", signedIn.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Login profile lookup failed", {
      code: profileError.code,
      message: profileError.message,
    });
    redirect("/login?error=Profile%20lookup%20failed");
  }

  redirect(profile?.global_role === "platform_admin" ? "/admin" : "/dashboard");
}

export async function logout() {
  if (isSupabaseConfigured()) {
    const sb = await createClient();
    await sb.auth.signOut();
  }
  redirect("/login");
}
