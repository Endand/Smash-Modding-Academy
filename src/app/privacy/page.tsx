import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, LegalList } from "@/components/legal-page";
import { DISCORD_URL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Privacy Policy — Smash Modding Academy",
  description: "What data Smash Modding Academy collects, why, and how to have it removed.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="6 September 2026"
      intro="Smash Modding Academy collects as little about you as it reasonably can. You can read every lesson on this site without an account, without being tracked, and without us storing anything about you. This page explains what changes if you do sign in, and what happens to that information."
    >
      <LegalSection heading="If you don't sign in">
        <p>
          You can browse the entire site anonymously. We don&rsquo;t run analytics, we don&rsquo;t use
          tracking or advertising cookies, and we don&rsquo;t build a profile of you.
        </p>
        <p>
          Two things still happen in your own browser. Your light or dark theme choice is saved in your
          browser&rsquo;s local storage so the site remembers it — that never leaves your device. And our
          host, Vercel, processes standard web server request data (such as your IP address) in order to
          serve pages and protect against abuse.
        </p>
      </LegalSection>

      <LegalSection heading="If you create an account">
        <p>
          Accounts are created by signing in through Google, GitHub or Discord. We never see your password
          for those services. From that sign-in we receive and store basic profile information — typically
          your email address, display name and avatar image — along with:
        </p>
        <LegalList
          items={[
            "The username you choose for the site.",
            "Which lessons you've marked as complete, so your progress persists across devices.",
            "Any staff role you've been given, and which courses or lessons you've been granted access to edit.",
            "If you contribute lesson content: the changes you make, attributed to your account, including changes still awaiting review.",
          ]}
        />
        <p>
          Signing in also sets essential cookies that keep you logged in. These are required for the
          account to work and aren&rsquo;t used for tracking or advertising.
        </p>
      </LegalSection>

      <LegalSection heading="Why we hold it">
        <LegalList
          items={[
            "To sign you in and keep you signed in.",
            "To show your lesson progress back to you.",
            "To decide what you're allowed to edit, and to attribute contributions so edits can be reviewed and credited.",
            "To investigate abuse or misuse of the site.",
          ]}
        />
        <p>
          We do not sell your personal information, and we do not share it with third parties for
          marketing.
        </p>
      </LegalSection>

      <LegalSection heading="Who processes data for us">
        <LegalList
          items={[
            "Supabase — hosts the database and handles authentication. Account details, progress and contributions are stored there.",
            "Vercel — hosts and serves the site, and processes standard server request data.",
            "Google, GitHub and Discord — only if you choose one of them to sign in with, and only at the point of signing in.",
            "Ko-fi — handles donations. Payments happen entirely on Ko-fi's own site under their privacy policy; we never see your payment details, and a donation isn't linked to your site account.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Publicly visible information">
        <p>
          Some information is visible to other people by design: your chosen username, and — if you write
          or edit lessons — your attribution as an author or editor. Your email address is never shown
          publicly.
        </p>
      </LegalSection>

      <LegalSection heading="Advertising">
        <p>
          There is currently no advertising on this site, and no advertising or tracking cookies are set.
        </p>
        <p>
          We may introduce advertising in future to cover the site&rsquo;s running costs. Advertising
          providers commonly set their own cookies or similar identifiers and may collect data about your
          visit in order to select and measure adverts. If and when that happens, we will update this
          policy to name the provider and describe what they collect, and we will put any consent controls
          in place that the law requires where you live — before adverts start appearing, not afterwards.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p>
          Account information and progress are kept for as long as your account exists. If you ask us to
          delete your account, we remove your profile, your progress and your personal details.
        </p>
        <p>
          Lesson content you contributed generally stays on the site, because it forms part of the
          published material other people rely on — but we will detach your name from it on request.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Depending on where you live you may have rights over your personal data, including the right to
          access it, correct it, have it deleted, or object to how it&rsquo;s used. You can exercise any of
          these by contacting us. We&rsquo;ll respond as quickly as we reasonably can — this is a
          volunteer-run project, so please allow a little time.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          The site isn&rsquo;t directed at young children, and accounts aren&rsquo;t intended for anyone
          under 13 (or the minimum age for consent to data processing where you live, if that&rsquo;s
          higher). If you believe a child has created an account, contact us and we&rsquo;ll remove it.
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          Access to accounts and to editing tools is controlled, and passwords are never handled by us.
          No online service can promise perfect security, but we take reasonable steps to protect what we
          store and to limit how much we store in the first place.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          When this policy changes, the date at the top is updated, and the full history of revisions is
          public in the site&rsquo;s source repository. Material changes — such as introducing advertising
          — will be described here before they take effect.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          To ask a question, request your data, or ask for your account to be deleted, reach us in our{" "}
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--accent-medium)" }}
          >
            Discord server
          </a>{" "}
          or through the{" "}
          <Link href="/contact" className="underline" style={{ color: "var(--accent-medium)" }}>
            contact page
          </Link>
          . See also our{" "}
          <Link href="/terms" className="underline" style={{ color: "var(--accent-medium)" }}>
            Terms of Use
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
