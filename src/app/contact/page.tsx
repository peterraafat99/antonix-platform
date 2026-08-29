import type { Metadata } from "next";
import { PageHero, PlaceholderNotice, PublicPage } from "@/components/public-site";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Contact", description: "Start a conversation about your digital presence, reputation, or automation needs." };

export default function ContactPage() {
  const subject = encodeURIComponent("New project enquiry");
  return (
    <PublicPage>
      <main>
        <PageHero eyebrow="Contact" title="Tell us what is taking too much time or not working well enough." description="You do not need a finished brief. Share the business, the problem, and what a useful result would look like." />
        <section className="public-section compact-top">
          <div className="site-container contact-grid">
            <div className="contact-card primary-contact">
              <span className="section-kicker">Start here</span>
              <h2>Send a project enquiry</h2>
              <p>Include the business name, location, current website or profile, and the main outcome you want to improve.</p>
              <a className="button button-accent" href={`mailto:${brand.email}?subject=${subject}`}>Email {brand.email} <span aria-hidden="true">↗</span></a>
            </div>
            <div className="contact-details">
              <article><small>Email</small><a href={`mailto:${brand.email}`}>{brand.email}</a></article>
              <article><small>Phone / WhatsApp</small><a href={`tel:${brand.phone.replace(/\s/g, "")}`}>{brand.phone}</a></article>
              <article><small>Service area</small><span>{brand.serviceArea}</span></article>
              <article><small>Support</small><a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a></article>
            </div>
          </div>
          <div className="site-container"><PlaceholderNotice /></div>
        </section>
        <section className="public-section expectation-section">
          <div className="site-container expectation-grid">
            <div><span className="section-kicker">What happens next</span><h2>A clear first conversation.</h2></div>
            <ol><li><span>01</span><p><strong>We review the context.</strong>We look at the business, current systems, and the requested outcome.</p></li><li><span>02</span><p><strong>We clarify the priority.</strong>We identify what must happen now and what can safely wait.</p></li><li><span>03</span><p><strong>We propose a next step.</strong>You receive a clear scope, responsibilities, timing, and cost before work begins.</p></li></ol>
          </div>
        </section>
      </main>
    </PublicPage>
  );
}
