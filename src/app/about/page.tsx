import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, PublicPage, SectionHeading } from "@/components/public-site";

export const metadata: Metadata = { title: "About", description: "A client focused marketing and technology agency built for practical delivery." };

export default function AboutPage() {
  return (
    <PublicPage>
      <main>
        <PageHero eyebrow="About the agency" title="Local business understanding, backed by careful technology." description="We bring client relationships and technical delivery into one accountable team, so strategy does not get lost between sales, marketing, and software suppliers." />
        <section className="public-section compact-top">
          <div className="site-container story-grid">
            <div className="story-statement"><span className="section-kicker">Why we exist</span><h2>Good businesses should not lose opportunities because their digital systems are fragmented.</h2></div>
            <div className="story-copy"><p>Our work starts with the way a business serves its customers. We then design the website, visibility, reputation, and automation layers needed to support that experience.</p><p>We favor focused systems over unnecessary complexity: clear ownership, transparent permissions, documented workflows, and the option for a person to step in whenever judgment matters.</p></div>
          </div>
        </section>
        <section className="public-section team-section">
          <div className="site-container">
            <SectionHeading eyebrow="Operating model" title="Commercial ownership and technical delivery stay connected." />
            <div className="team-grid">
              <article><span className="role-mark">CO</span><small>Owner &amp; client operations</small><h3>[Owner name]</h3><p>Leads the agency, client relationships, local delivery, and commercial decisions.</p></article>
              <article><span className="role-mark">TS</span><small>Technology &amp; systems</small><h3>[Technical lead name]</h3><p>Designs, develops, secures, and maintains the platforms and automations behind the service.</p></article>
              <article className="team-principle"><span className="role-mark">01</span><small>One shared standard</small><h3>Useful before impressive.</h3><p>Every system must solve a real operational problem, be understandable to its owner, and remain maintainable after launch.</p></article>
            </div>
          </div>
        </section>
        <section className="public-section values-section">
          <div className="site-container values-grid">
            <SectionHeading eyebrow="Our standards" title="The principles behind every client system." />
            <div>
              <article><span>01</span><h3>Business ownership</h3><p>Clients keep ownership of their accounts, data, profiles, and decisions.</p></article>
              <article><span>02</span><h3>Transparent automation</h3><p>Automation rules are explicit, reversible, and visible to the people responsible.</p></article>
              <article><span>03</span><h3>Secure by design</h3><p>Access is separated by client, credentials remain protected, and permissions stay narrow.</p></article>
              <article><span>04</span><h3>Measured improvement</h3><p>We prioritize outcomes that can be observed rather than promises that cannot be verified.</p></article>
            </div>
          </div>
        </section>
        <section className="cta-section"><div className="site-container cta-inner"><div><span className="section-kicker">Work with us</span><h2>Bring us the business problem, not a technology shopping list.</h2></div><Link className="button button-accent" href="/contact">Start a conversation <span aria-hidden="true">→</span></Link></div></section>
      </main>
    </PublicPage>
  );
}
