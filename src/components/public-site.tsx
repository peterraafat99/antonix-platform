import Link from "next/link";
import type { ReactNode } from "react";
import { brand } from "@/lib/brand";
import { AntonixIcon } from "@/components/brand-logo";

const navigation = [
  ["/services", "Services"],
  ["/about", "About"],
  ["/google-data", "Google data"],
  ["/contact", "Contact"],
] as const;

export function BrandLockup({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand-lockup${inverse ? " brand-lockup-inverse" : ""}`} href="/" aria-label={`${brand.name} home`}>
      <AntonixIcon size={42} />
      <span>
        <strong>{brand.name}</strong>
        <small>{brand.descriptor}</small>
      </span>
    </Link>
  );
}

export function PublicHeader() {
  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <BrandLockup />
        <nav className="public-nav" aria-label="Primary navigation">
          {navigation.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <Link className="button button-dark header-login" href="/login">Client login <span aria-hidden="true">↗</span></Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-grid">
        <div className="footer-intro">
          <BrandLockup inverse />
          <p>Autonomous AI review management, reputation intelligence, and in-store customer feedback conversion for high-growth businesses.</p>
        </div>
        <div>
          <strong>Explore</strong>
          <Link href="/services">Services</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login">Client login</Link>
        </div>
        <div>
          <strong>Trust</strong>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/google-data">Google data &amp; disconnect</Link>
        </div>
        <div>
          <strong>Contact</strong>
          <a href={`mailto:${brand.email}`}>{brand.email}</a>
          <span>{brand.phone}</span>
          <span>{brand.serviceArea}</span>
        </div>
      </div>
      <div className="site-container footer-bottom">
        <span>© {new Date().getFullYear()} {brand.name}. All rights reserved.</span>
        <span>Enterprise AI Google Review Platform</span>
      </div>
    </footer>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="site-container">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{description}</p>
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({
  kicker,
  eyebrow,
  title,
  description,
}: {
  kicker?: string;
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-heading">
      <span className="section-kicker">{eyebrow ?? kicker ?? "SYSTEM"}</span>
      <h2>{title}</h2>
      {description && <p className="section-subtitle">{description}</p>}
    </div>
  );
}

export function PreLaunchNotice() {
  if (!brand.isPlaceholder) return null;
  return (
    <aside className="pre-launch-bar" aria-label="Pre-launch notice">
      <div className="site-container">
        <strong>Pre-launch notice:</strong> update branding in <code>src/lib/brand.ts</code>.
      </div>
    </aside>
  );
}

export function PlaceholderNotice() {
  return <PreLaunchNotice />;
}

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="public-site">
      <PreLaunchNotice />
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
