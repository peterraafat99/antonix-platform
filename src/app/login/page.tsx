import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { brand } from "@/lib/brand";
import { LoginForm } from "@/components/login-form";
import { AntonixIcon } from "@/components/brand-logo";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = isSupabaseConfigured();
  return (
    <main className="auth">
      <section className="auth-story">
        <Link className="brand" href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.85rem" }}>
          <AntonixIcon size={46} />
          <span style={{ fontWeight: 800, letterSpacing: "0.08em", fontSize: "1.45rem" }}>{brand.name}</span>
        </Link>
        <blockquote>Autonomous review intelligence. Brand safe responses. Growth you can measure.</blockquote>
        <small>Enterprise AI Google Review Platform</small>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <b className="eyebrow">WELCOME BACK</b>
          <h1>Sign in</h1>
          <p>Access your {brand.name} reputation dashboard.</p>
          {!configured && (
            <p className="setup">
              Copy <code>.env.example</code> to <code>.env.local</code> and add Supabase values.
            </p>
          )}
          {error && (
            <p className="message" role="alert">
              {error}
            </p>
          )}
          <LoginForm configured={configured} />
          <p className="auth-help">
            <Link href="/forgot-password">Forgot your password?</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
