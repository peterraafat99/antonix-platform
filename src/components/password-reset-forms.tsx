"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);
    if (resetError) {
      setError("We could not send the reset email. Check the address and try again.");
      return;
    }
    setMessage("Check your email for a new password-reset link. Use the newest link once, and open it within a few minutes.");
  }

  return (
    <form onSubmit={submit}>
      <label className="field">Email<input name="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      {error && <p className="message" role="alert">{error}</p>}
      {message && <p className="message" role="status">{message}</p>}
      <button className="button primary" type="submit" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}

export function PasswordUpdateForm() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("This reset link is invalid or expired. Request a new link and use only the newest email.");
      return;
    }
    setMessage("Password updated. You can now sign in with the new password.");
    setPassword("");
    setConfirmation("");
  }

  if (!ready) return <p className="message" role="status">Open this page from the newest password-reset email.</p>;

  return (
    <form onSubmit={submit}>
      <label className="field">New password<input name="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label className="field">Confirm new password<input name="confirmation" type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      {error && <p className="message" role="alert">{error}</p>}
      {message && <p className="message" role="status">{message}</p>}
      <button className="button primary" type="submit" disabled={loading}>{loading ? "Updating…" : "Update password"}</button>
    </form>
  );
}
