import type { Metadata } from "next";
import { PageHero, PlaceholderNotice, PublicPage } from "@/components/public-site";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Terms of Service", description: "Terms for agency and platform services." };

export default function TermsPage() {
  return (
    <PublicPage>
      <main>
        <PageHero eyebrow="Legal" title="Terms of Service" description={`These terms outline the expected rules for accessing ${brand.name}'s website, client workspace, and managed services.`} />
        <section className="public-section compact-top"><div className="site-container legal-layout">
          <aside><strong>On this page</strong><a href="#agreement">Agreement</a><a href="#services">Services</a><a href="#accounts">Accounts</a><a href="#authorization">Client authorization</a><a href="#ai">AI assisted features</a><a href="#fees">Fees</a><a href="#ownership">Ownership</a><a href="#ending">Ending service</a></aside>
          <article className="legal-copy">
            <PlaceholderNotice />
            <p className="effective-date">Effective: {brand.policyEffectiveDate}</p>
            <section id="agreement"><h2>1. Agreement</h2><p>By using the website or an activated client workspace, you agree to these Terms and any signed proposal, order form, or service agreement. If those documents conflict, the signed agreement controls for the relevant service.</p></section>
            <section id="services"><h2>2. Services</h2><p>Services may include marketing strategy, website delivery, local visibility, reputation management, automation, software access, maintenance, and related consulting. Scope, timing, fees, and acceptance criteria should be defined in writing before paid work begins.</p></section>
            <section id="accounts"><h2>3. Accounts and security</h2><p>You must provide accurate information, protect your login methods, and promptly report suspected unauthorized access. Accounts are for authorized users and may not be sold, shared publicly, or used to access another client’s information.</p></section>
            <section id="authorization"><h2>4. Client authorization and connected services</h2><p>You confirm that you own or are authorized to manage every business profile, location, and third party account you connect. You remain responsible for the accuracy of business information and for choosing who may act on the business’s behalf.</p><p>Connected services remain governed by their own terms and policies. You may disconnect a supported integration at any time. We may suspend an integration when required to protect the account, comply with a platform policy, or prevent unauthorized activity.</p></section>
            <section id="ai"><h2>5. AI assisted features</h2><p>AI output can be incomplete, inaccurate, or unsuitable. You are responsible for selecting automation settings and for reviewing content where judgment is required. If you explicitly enable automatic publishing, you authorize the service to publish eligible outputs according to the selected business, location, rating, risk, and escalation rules.</p><p>We may block or escalate output that appears unsafe, unlawful, misleading, abusive, or inconsistent with platform policies. The service does not guarantee a specific rating, ranking, revenue result, or customer response.</p></section>
            <section id="fees"><h2>6. Fees and changes</h2><p>Fees, taxes, payment timing, refunds, renewals, usage allowances, and third party costs will be stated in the applicable proposal or plan. Additional work outside the agreed scope requires approval.</p></section>
            <section id="ownership"><h2>7. Ownership and licenses</h2><p>Each party retains its pre existing intellectual property. The client retains ownership of its business content, accounts, and data. Ownership of custom deliverables and the license to use platform software will be defined in the applicable agreement. You grant us the limited permission required to process submitted content and operate the requested service.</p></section>
            <section id="acceptable"><h2>8. Acceptable use</h2><p>You may not use the service to impersonate others, obtain unauthorized access, publish illegal or deceptive content, interfere with the platform, bypass limits, scrape data unlawfully, or violate the policies of Google or any connected service.</p></section>
            <section id="availability"><h2>9. Availability and third parties</h2><p>We work to provide a dependable service, but availability can be affected by maintenance, internet failures, third party APIs, policy changes, or events outside our reasonable control. Features dependent on third parties may change or become unavailable.</p></section>
            <section id="liability"><h2>10. Disclaimers and liability</h2><p>The final commercial agreement must contain the warranty exclusions, liability limits, indemnities, and governing law terms appropriate to the business’s registration country. This placeholder page must be reviewed before accepting paying customers.</p></section>
            <section id="ending"><h2>11. Ending the service</h2><p>Either party may end services as described in the applicable agreement. On termination, access may be disabled after a reasonable export or transition period, outstanding fees remain due, and connected account permissions will be relinquished as required. Clients can request disconnection and regain exclusive control of their Business Profiles.</p></section>
            <section id="contact-terms"><h2>12. Contact</h2><p>Questions about these Terms can be sent to <a href={`mailto:${brand.email}`}>{brand.email}</a>.</p></section>
          </article>
        </div></section>
      </main>
    </PublicPage>
  );
}
