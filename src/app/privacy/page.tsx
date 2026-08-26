import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, PlaceholderNotice, PublicPage } from "@/components/public-site";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Privacy Policy", description: "How the agency and its platform handle personal and Google user data." };

export default function PrivacyPage() {
  return (
    <PublicPage>
      <main>
        <PageHero eyebrow="Legal" title="Privacy Policy" description={`This pre-launch policy describes how ${brand.name} expects to collect, use, protect, retain, and delete information when delivering agency services and operating its client platform.`} />
        <section className="public-section compact-top"><div className="site-container legal-layout">
          <aside><strong>On this page</strong><a href="#who">Who we are</a><a href="#collect">Information collected</a><a href="#google">Google user data</a><a href="#use">How information is used</a><a href="#share">Sharing</a><a href="#security">Security &amp; retention</a><a href="#rights">Your choices</a><a href="#contact-privacy">Contact</a></aside>
          <article className="legal-copy">
            <PlaceholderNotice />
            <p className="effective-date">Effective: {brand.policyEffectiveDate}</p>
            <section id="who"><h2>1. Who we are</h2><p>{brand.legalName}, operating as {brand.name}, provides digital marketing, website, reputation-management, and automation services. References to “we,” “us,” or “our” mean this business. This policy applies to our public website, client platform, and related services.</p></section>
            <section id="collect"><h2>2. Information we collect</h2><p>Depending on the service, we may collect contact details, account identifiers, business information, communications, support requests, configuration choices, security and audit events, subscription records, and information submitted through the client workspace.</p><p>We may also receive limited technical information such as IP address, browser type, device information, and timestamps when needed to secure, operate, and troubleshoot the service.</p></section>
            <section id="google"><h2>3. Google user data</h2><p>When an authorized business user chooses to connect a Google account, the platform requests the minimum OAuth permission needed to manage that user’s authorized Business Profile information. Depending on enabled features, this can include account and location identifiers, business profile details, reviews, existing review replies, and the ability to create, update, or delete review replies.</p><p>Google passwords never pass through our service. OAuth access and refresh tokens are protected server-side and used only to provide or improve user-facing features that the authorized user enables. We do not sell Google user data, use it for advertising, or transfer it to unrelated third parties.</p><p>Review content is fetched for the authorized workflow. Any temporary storage must remain limited, secure, and subject to the applicable Google Business Profile API retention requirements. See <Link href="/google-data">Google Data &amp; Disconnect</Link> for a plain-language explanation.</p></section>
            <section id="use"><h2>4. How information is used</h2><p>We use information to authenticate users; deliver contracted services; connect authorized platforms; display reviews and locations; generate or publish replies according to client settings; provide support; maintain security; prevent abuse; troubleshoot problems; and meet legal obligations.</p><p>Automated publishing, where available, is activated only after the responsible client explicitly enables it and selects the applicable locations and rules.</p></section>
            <section id="share"><h2>5. Service providers and disclosure</h2><p>We may use carefully selected infrastructure, database, authentication, hosting, communications, analytics, payment, and AI providers to perform services on our behalf. They receive only the information reasonably needed for their role and are subject to their contractual and legal obligations.</p><p>We may disclose information when required by law, to protect users and the service, or as part of a properly structured business transaction. We do not sell personal information or Google user data.</p></section>
            <section id="security"><h2>6. Security and retention</h2><p>We use measures appropriate to the service, including encrypted transport, protected server credentials, access controls, tenant separation, audit records, and backups. No system can guarantee absolute security.</p><p>We retain information only for as long as needed for the purposes described here, the active client relationship, security, dispute resolution, and applicable legal requirements. Google-provided content is subject to additional product-specific storage limits. When a retention period ends, information is deleted or de-identified where appropriate.</p></section>
            <section id="rights"><h2>7. Your choices and rights</h2><p>You may ask to access, correct, export, or delete eligible personal information, subject to applicable law and necessary verification. You can disconnect Google access in the platform or revoke it from your Google Account. Disconnecting stops new API access; deletion of retained platform data can be requested separately.</p></section>
            <section id="children"><h2>8. Children</h2><p>The service is intended for businesses and authorized adult users. It is not directed to children.</p></section>
            <section id="changes"><h2>9. Changes</h2><p>We may update this policy as the service, providers, or legal requirements change. The published effective date will be updated, and material changes will be communicated where required.</p></section>
            <section id="contact-privacy"><h2>10. Contact</h2><p>Privacy questions and deletion requests can be sent to <a href={`mailto:${brand.privacyEmail}`}>{brand.privacyEmail}</a>. General support requests can be sent to <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>.</p></section>
          </article>
        </div></section>
      </main>
    </PublicPage>
  );
}
