import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";
import { brand } from "@/lib/brand";
import { AntonixIcon } from "@/components/brand-logo";

const nav = {
  admin: [
    ["/admin", "Overview"],
    ["/admin/companies", "Companies"],
    ["/admin/users", "Users & Access"],
    ["/admin/reviews", "Review Feed"],
    ["/admin/analytics", "Analytics"],
  ],
  business: [
    ["/dashboard", "Overview"],
    ["/dashboard/google", "Google Locations"],
    ["/dashboard/settings", "AI & Workspace Settings"],
  ],
};

export function DashboardShell({
  kind,
  title,
  subtitle,
  isPlatformAdmin = false,
  children,
}: {
  kind: "admin" | "business";
  title: string;
  subtitle: string;
  isPlatformAdmin?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href={kind === "admin" ? "/admin" : "/dashboard"} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0" }}>
          <AntonixIcon size={34} />
          <span style={{ fontWeight: 800, letterSpacing: "0.08em", fontSize: "1.2rem", color: "#ffffff" }}>{brand.name}</span>
        </Link>
        <nav>
          {nav[kind].map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <footer>
          {isPlatformAdmin && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
              {kind === "business" ? (
                <Link href="/admin" style={{ fontSize: "0.75rem", color: "#94a3b8", textDecoration: "underline" }}>
                  Switch to Admin Panel →
                </Link>
              ) : (
                <Link href="/dashboard" style={{ fontSize: "0.75rem", color: "#94a3b8", textDecoration: "underline" }}>
                  Switch to Client Workspace →
                </Link>
              )}
            </div>
          )}
          <form action={logout}>
            <button className="button danger" type="submit" style={{ width: "100%", fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}>
              Sign out
            </button>
          </form>
        </footer>
      </aside>
      <main className="workspace">
        <header className="header">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="badge">{kind === "admin" ? "Platform Admin" : "Client Workspace"}</div>
        </header>
        {children}
      </main>
    </div>
  );
}
