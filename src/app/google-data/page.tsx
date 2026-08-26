import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, PlaceholderNotice, PublicPage, SectionHeading } from "@/components/public-site";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Google Data & Disconnect", description: "How the platform accesses Google Business Profile data and how clients stay in control." };

export default function GoogleDataPage() {
  return (
    <PublicPage>
      <main>
        <PageHero eyebrow="Transparency" title="Google data access, explained clearly." description="Business owners keep control of their Google Business Profiles. The platform receives access only after an authorized user signs in and grants permission." />
        <section className="public-section compact-top">
          <div className="site-container"><PlaceholderNotice /></div>
          <div className="site-container data-flow" aria-label="Google Business Profile connection flow">
            <article><span>01</span><h2>Connect</h2><p>An authorized client clicks Connect Google and signs in directly with Google.</p></article>
            <span className="flow-arrow" aria-hidden="true">→</span>
            <article><span>02</span><h2>Authorize</h2><p>Google shows the requested permission. The client chooses whether to grant it.</p></article>
            <span className="flow-arrow" aria-hidden="true">→</span>
            <article><span>03</span><h2>Select</h2><p>The client chooses which accessible business locations the workspace should manage.</p></article>
            <span className="flow-arrow" aria-hidden="true">→</span>
            <article><span>04</span><h2>Control</h2><p>The client selects draft, approval, automation, and escalation settings and may disconnect later.</p></article>
          </div>
        </section>
        <section className="public-section data-details-section"><div className="site-container feature-grid">
          <SectionHeading eyebrow="What the platform uses" title="Only the data needed for the enabled workflow." description="The precise data available depends on the connected account, authorized locations, Google APIs, and features the business chooses to use." />
          <div className="detail-stack">
            <article><h3>Account and location identifiers</h3><p>Used to show authorized Business Profile accounts and keep each business location mapped to the correct client workspace.</p></article>
            <article><h3>Business Profile information</h3><p>Used to identify the location and personalize the management experience.</p></article>
            <article><h3>Reviews and existing replies</h3><p>Used to display feedback, prepare a response, prevent duplicate work, and show the current reply state.</p></article>
            <article><h3>Permission to manage replies</h3><p>Used only when an authorized client requests or enables a review-reply action.</p></article>
          </div>
        </div></section>
        <section className="public-section control-section"><div className="site-container">
          <SectionHeading eyebrow="Client controls" title="Authorization once. Control at every step." />
          <div className="control-grid">
            <article><span>Draft only</span><h3>No automatic publishing</h3><p>The system prepares a suggested reply and waits for an authorized person to take action.</p></article>
            <article><span>Approval workflow</span><h3>Review before publishing</h3><p>The client approves or edits the reply inside the workspace before it is sent to Google.</p></article>
            <article><span>Explicit automation</span><h3>Rules selected by the client</h3><p>Eligible replies can be published under the locations, ratings, and safeguards the client specifically enables.</p></article>
          </div>
        </div></section>
        <section className="public-section disconnect-section"><div className="site-container feature-grid">
          <div><span className="section-kicker">Disconnect &amp; delete</span><h2>Leaving must be straightforward.</h2><p>Clients can stop future Google access and can separately request deletion of eligible platform data.</p></div>
          <ol>
            <li><span>01</span><p><strong>Inside the platform</strong>Open the Google Profile settings and choose Disconnect when that feature is available for the account.</p></li>
            <li><span>02</span><p><strong>Inside your Google Account</strong>Open Google Account security settings, find the connected third-party app, and remove access.</p></li>
            <li><span>03</span><p><strong>Request deletion</strong>Email <a href={`mailto:${brand.privacyEmail}`}>{brand.privacyEmail}</a> from the authorized account. We may verify the request before deleting eligible retained data.</p></li>
          </ol>
        </div></section>
        <section className="cta-section"><div className="site-container cta-inner"><div><span className="section-kicker">Related information</span><h2>Read the full Privacy Policy for retention, security, and service-provider details.</h2></div><Link className="button button-accent" href="/privacy">Read Privacy Policy <span aria-hidden="true">→</span></Link></div></section>
      </main>
    </PublicPage>
  );
}
