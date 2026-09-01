import Link from "next/link";
import { PublicPage, SectionHeading } from "@/components/public-site";

const services = [
  { number: "01", title: "Digital presence", text: "Fast, credible websites and landing pages designed to turn local attention into qualified enquiries.", tags: ["Web design", "Landing pages", "Conversion"] },
  { number: "02", title: "Local visibility", text: "Clear local search foundations that help the right customers find, understand, and trust your business.", tags: ["Local SEO", "Business profiles", "Content"] },
  { number: "03", title: "Reputation systems", text: "A consistent process for monitoring feedback and responding in the business's own voice.", tags: ["Review workflow", "Brand voice", "Escalation"] },
  { number: "04", title: "Smart automation", text: "Thoughtful automation that removes repetitive work while keeping owners informed and in control.", tags: ["AI workflows", "Integrations", "Reporting"] },
] as const;

const process = [
  ["Discover", "We learn how the business wins customers, where time is lost, and what success should look like."],
  ["Design", "We shape one focused system with clear responsibilities, safeguards, and measurable outcomes."],
  ["Deliver", "We build, test, document, and launch without asking the client to become a technology expert."],
  ["Improve", "We review performance and refine the system as the business and its customers evolve."],
] as const;

export default function Home() {
  return (
    <PublicPage>
      <main>
        <section className="home-hero">
          <div className="site-container hero-grid">
            <div className="hero-copy">
              <span className="section-kicker">Marketing × technology × automation</span>
              <h1>Build a stronger local presence. <em>Then make it work for you.</em></h1>
              <p>We create the digital systems behind modern local businesses, from websites and visibility to reputation management and practical AI automation.</p>
              <div className="hero-actions">
                <Link className="button button-accent" href="/contact">Start a conversation <span aria-hidden="true">→</span></Link>
                <Link className="text-action" href="/services">Explore our services <span aria-hidden="true">↗</span></Link>
              </div>
              <div className="hero-proof" aria-label="How we work">
                <span>Strategy driven</span><span>Owner controlled</span><span>Built to scale</span>
              </div>
            </div>
            <div className="hero-system" aria-label="Digital growth system illustration">
              <div className="system-topline"><span>Growth system</span><span className="live-dot">Active</span></div>
              <div className="system-score"><small>Reputation coverage</small><strong>Consistent</strong><span>Every customer touchpoint has a clear next action.</span></div>
              <div className="system-cards">
                <div><span className="mini-icon">↗</span><small>Visibility</small><strong>Be found</strong></div>
                <div><span className="mini-icon">✦</span><small>Reputation</small><strong>Build trust</strong></div>
                <div><span className="mini-icon">⌁</span><small>Automation</small><strong>Save time</strong></div>
              </div>
              <div className="system-message"><span className="avatar-placeholder">AI</span><p><strong>A new review arrives</strong><small>Draft, approve, or publish according to the selected business rules.</small></p><span className="status-pill">Ready</span></div>
            </div>
          </div>
        </section>

        <section className="statement-strip">
          <div className="site-container strip-grid">
            <span>One partner</span><span>One connected system</span><span>Clear business ownership</span><span>Less repetitive work</span>
          </div>
        </section>

        <section className="public-section services-section">
          <div className="site-container">
            <SectionHeading eyebrow="What we build" title="The essentials for sustainable digital growth." description="Start with one urgent problem or connect the full customer journey. Every service is designed to work as part of a larger system." />
            <div className="service-grid">
              {services.map((service) => (
                <article className="service-card" key={service.number}>
                  <span className="card-number">{service.number}</span>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                  <div className="tag-list">{service.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                </article>
              ))}
            </div>
            <Link className="text-action section-link" href="/services">See every service <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section className="public-section feature-section" id="review-automation">
          <div className="site-container feature-grid">
            <div>
              <SectionHeading eyebrow="Featured system" title="Review management without the daily busywork." description="The platform connects to each client's authorized business profile, brings reviews into one workspace, and prepares a response in the business's preferred voice." />
              <ul className="check-list">
                <li><span>01</span><p><strong>Personalized by business</strong>Tone, language, location, and response rules remain separate for every client.</p></li>
                <li><span>02</span><p><strong>Approval is optional</strong>Owners can review every draft or explicitly enable automation for eligible reviews.</p></li>
                <li><span>03</span><p><strong>Sensitive cases are protected</strong>Low ratings, risky subjects, and low confidence drafts can always be escalated.</p></li>
              </ul>
              <Link className="button button-light" href="/google-data">How Google data is handled <span aria-hidden="true">→</span></Link>
            </div>
            <div className="workflow-panel">
              <div className="workflow-header"><span>Response workflow</span><span>Client rules</span></div>
              <div className="review-sample">
                <div className="review-author"><span className="avatar-placeholder">JM</span><p><strong>Jordan M.</strong><small>New customer review</small></p><span className="review-stars">★★★★★</span></div>
                <p>“The team explained everything clearly and made the whole experience easy.”</p>
              </div>
              <div className="workflow-line" aria-hidden="true"><span>AI prepares a brand safe draft</span></div>
              <div className="reply-sample"><span className="mini-icon">✦</span><p>Thank you, Jordan. We’re glad the process felt clear and straightforward from beginning to end.</p></div>
              <div className="workflow-options"><span className="selected-option">Auto-publish eligible</span><span>Request approval</span><span>Escalate</span></div>
            </div>
          </div>
        </section>

        <section className="public-section process-section">
          <div className="site-container">
            <SectionHeading eyebrow="How we work" title="Small steps. Clear ownership. Useful outcomes." />
            <div className="process-grid">
              {process.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="site-container cta-inner">
            <div><span className="section-kicker">A better operating system for growth</span><h2>Start with the problem costing your business the most time.</h2></div>
            <Link className="button button-accent" href="/contact">Talk to our team <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>
    </PublicPage>
  );
}
