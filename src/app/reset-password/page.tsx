import Link from "next/link";
import { brand } from "@/lib/brand";
import { PasswordUpdateForm } from "@/components/password-reset-forms";
import { AntonixIcon } from "@/components/brand-logo";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="auth">
      <section className="auth-story">
        <Link className="brand" href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.85rem" }}>
          <AntonixIcon size={46} />
          <span style={{ fontWeight: 800, letterSpacing: "0.08em", fontSize: "1.45rem" }}>{brand.name}</span>
        </Link>
        <blockquote>Autonomous review intelligence. Brand-safe responses. Growth you can measure.</blockquote>
        <small>Enterprise AI Google Review Platform</small>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <b className="eyebrow">NEW PASSWORD</b>
          <h1>Set New Password</h1>
          <p>Please enter your new secure password below.</p>
          {error && <p className="message" role="alert">{error}</p>}
          <PasswordUpdateForm />
          <p className="auth-help">
            <Link href="/login">← Back to sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
