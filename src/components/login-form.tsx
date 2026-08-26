"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    if (signInError) {
      setLoading(false);
      setError("Sign in failed. Check the email and application password.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return <form onSubmit={submit}>
    <label className="field">Email<input name="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label className="field">Password<input name="password" type="password" minLength={8} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    {error && <p className="message" role="alert">{error}</p>}
    <button className="button primary" type="submit" disabled={!configured || loading}>{loading ? "Signing in…" : "Sign in securely"}</button>
  </form>;
}
