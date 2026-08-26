import Link from "next/link";
import { brand } from "@/lib/brand";
import { PasswordResetRequestForm } from "@/components/password-reset-forms";
import { AntonixIcon } from "@/components/brand-logo";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
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
          <b className="eyebrow">RECOVERY</b>
          <h1>Reset Password</h1>
          <p>Enter your account email to receive a password reset link.</p>
          {sent && <p className="notice success">If an account exists, a reset link has been sent to your email.</p>}
          {error && <p className="message" role="alert">{error}</p>}
          <PasswordResetRequestForm />
          <p className="auth-help">
            <Link href="/login">← Back to sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
