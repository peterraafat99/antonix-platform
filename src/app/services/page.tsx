import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, PublicPage, SectionHeading } from "@/components/public-site";

export const metadata: Metadata = { title: "Services", description: "Websites, local visibility, reputation systems, and practical business automation." };

const offerings = [
  { code: "WEB", title: "Websites that earn attention", summary: "A clear, fast digital home that explains the offer and makes the next step easy.", deliverables: ["Positioning and page structure", "Responsive design and development", "Contact and conversion journeys", "Performance and technical foundations"] },
  { code: "LOCAL", title: "Local search foundations", summary: "Accurate, useful information wherever nearby customers evaluate the business.", deliverables: ["Business Profile management", "Local SEO foundations", "Location and service content", "Ongoing accuracy checks"] },
  { code: "TRUST", title: "Reputation management", summary: "A reliable process for understanding feedback and responding with care and consistency.", deliverables: ["Review monitoring workflows", "Brand voice and reply rules", "Approval and escalation paths", "Response coverage reporting"] },
  { code: "FLOW", title: "Marketing automation", summary: "Connected workflows that reduce manual follow up without making the customer experience feel robotic.", deliverables: ["Lead capture and routing", "Notifications and follow up", "CRM and platform integrations", "Measurement and maintenance"] },
  { code: "AI", title: "Practical AI systems", summary: "Focused AI features with human controls, clear boundaries, and a measurable business purpose.", deliverables: ["AI review responses", "Business specific instructions", "Confidence and risk rules", "Usage and quality monitoring"] },
  { code: "CARE", title: "Ongoing digital management", summary: "One accountable partner for improvements, maintenance, and the small issues that otherwise pile up.", deliverables: ["Technical maintenance", "Content and campaign support", "Monthly priority reviews", "Clear change records"] },
] as const;

export default function ServicesPage() {
  return (
    <PublicPage>
      <main>
        <PageHero eyebrow="Services" title="Useful digital systems, built around real business work." description="We combine marketing, software, and automation so clients can improve their presence without coordinating a different supplier for every problem." />
        <section className="public-section compact-top">
          <div className="site-container offering-list">
            {offerings.map((offering, index) => (
              <article className="offering-row" key={offering.code}>
                <div className="offering-index"><span>{String(index + 1).padStart(2, "0")}</span><small>{offering.code}</small></div>
                <div><h2>{offering.title}</h2><p>{offering.summary}</p></div>
                <ul>{offering.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>
        <section className="public-section approach-band">
          <div className="site-container feature-grid">
            <SectionHeading eyebrow="Flexible engagement" title="Begin with one service. Keep the system connected." description="A client can start with a website, reputation workflow, or automation project. We document the foundations so every later improvement builds on what already works." />
            <div className="engagement-options">
              <article><span>01</span><h3>Focused project</h3><p>A defined outcome, scope, delivery plan, and handover.</p></article>
              <article><span>02</span><h3>Managed growth</h3><p>Ongoing priorities, implementation, reporting, and optimization.</p></article>
              <article><span>03</span><h3>Platform access</h3><p>Client workspace access for supported automation and reputation tools.</p></article>
            </div>
          </div>
        </section>
        <section className="cta-section"><div className="site-container cta-inner"><div><span className="section-kicker">Not sure where to begin?</span><h2>We’ll identify the smallest useful first step.</h2></div><Link className="button button-accent" href="/contact">Discuss your business <span aria-hidden="true">→</span></Link></div></section>
      </main>
    </PublicPage>
  );
}
