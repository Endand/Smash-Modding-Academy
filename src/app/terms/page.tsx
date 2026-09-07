import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, LegalList } from "@/components/legal-page";
import { DISCORD_URL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Terms of Use — Smash Modding Academy",
  description: "The terms that apply when you use Smash Modding Academy.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      updated="6 September 2026"
      intro="Smash Modding Academy is a free, community-run site that teaches modding for Super Smash Bros. Ultimate. By using the site you agree to the terms below. If you don't agree with them, please don't use the site."
    >
      <LegalSection heading="Who we are">
        <p>
          Smash Modding Academy (&ldquo;the site&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is an independent,
          community-run educational project. We are not a company, and we are not affiliated with,
          endorsed by, or connected to Nintendo, HAL Laboratory, Sora Ltd., or any other rights holder
          associated with Super Smash Bros. Ultimate.
        </p>
        <p>
          Super Smash Bros. Ultimate and all related names, characters and imagery are the property of
          their respective owners. They are referred to here only for the purpose of describing and
          teaching about the game.
        </p>
      </LegalSection>

      <LegalSection heading="Modding is done at your own risk">
        <p>
          This is the most important thing on this page. The site publishes information about modifying
          game files. Following that information is entirely your own decision and your own
          responsibility. In particular, you should understand that:
        </p>
        <LegalList
          items={[
            "Modifying a game may breach the terms of service or end-user licence agreement of the game, the console, or an online service.",
            "Using mods online can result in your account or hardware being suspended or permanently banned from online services.",
            "Modding can corrupt save data, brick a console, or otherwise damage hardware and software beyond repair.",
            "Laws about modifying software, circumventing technical protection measures, and obtaining game files differ from country to country. You are responsible for knowing and following the law where you live.",
          ]}
        />
        <p>
          We do not host, link to, or help you obtain copyrighted game files. Nothing on this site should
          be read as encouragement to pirate a game or to break the law or any agreement you are party to.
          You accept all risk arising from anything you do with the information here.
        </p>
      </LegalSection>

      <LegalSection heading="Accounts">
        <p>
          Reading the site does not require an account. If you create one, you sign in through Google,
          GitHub or Discord — we never see or store your password for those services.
        </p>
        <LegalList
          items={[
            "You are responsible for activity that happens under your account.",
            "Choose a username that isn't impersonating someone else, offensive, or misleading.",
            "We may suspend or remove an account that is being used to break these terms.",
            "You can ask us to delete your account and its data at any time — see the Privacy Policy.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>When using the site, please don&rsquo;t:</p>
        <LegalList
          items={[
            "Post content that is unlawful, harassing, hateful, or that infringes someone else's rights.",
            "Upload malware, or link to files that would harm someone's device.",
            "Attempt to gain access to accounts, data, or administrative functions that aren't yours.",
            "Disrupt or overload the site, or scrape it in a way that degrades it for other people.",
            "Misrepresent yourself as staff, or as affiliated with a rights holder.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Contributions to lessons">
        <p>
          Some users are granted rights to write and edit lesson content. If you contribute, you keep
          ownership of what you write, but you give us a non-exclusive, worldwide, royalty-free licence
          to publish, display, edit, translate and distribute it as part of the site, including after
          you stop contributing.
        </p>
        <p>
          You confirm that what you submit is your own work, or that you have the right to submit it, and
          that publishing it doesn&rsquo;t infringe anyone else&rsquo;s rights. Contributions may be
          edited, reordered, or removed at our discretion, and edits from some contributors are reviewed
          before they go live.
        </p>
      </LegalSection>

      <LegalSection heading="Our content">
        <p>
          Lesson text and site design are made available for you to read, learn from, and share links to.
          Please don&rsquo;t republish substantial parts of the site elsewhere as if it were your own. If
          you&rsquo;d like to translate or reuse a lesson, ask us first — the answer is usually yes.
        </p>
      </LegalSection>

      <LegalSection heading="Donations">
        <p>
          Donations are voluntary and are handled by Ko-fi, not by us. They pay for hosting and running
          costs. A donation does not buy a product, a service, early access, or any influence over what
          the site publishes, and it does not create a membership or subscription with us. Refunds are
          subject to Ko-fi&rsquo;s own policies.
        </p>
      </LegalSection>

      <LegalSection heading="Advertising">
        <p>
          The site may display advertising in future to help cover its costs. Where it does, adverts will
          be identifiable as adverts, and any data practices introduced by an advertising provider will be
          described in the{" "}
          <Link href="/privacy" className="underline" style={{ color: "var(--accent-medium)" }}>
            Privacy Policy
          </Link>{" "}
          before or when they begin. We are not responsible for the content of third-party adverts or for
          the sites they link to.
        </p>
      </LegalSection>

      <LegalSection heading="Third-party links and services">
        <p>
          The site links to external places such as Discord, GitHub, Ko-fi and modding tools. We don&rsquo;t
          control those services and aren&rsquo;t responsible for their content, availability, or how they
          handle your data. Their own terms and policies apply when you use them.
        </p>
      </LegalSection>

      <LegalSection heading="No warranty">
        <p>
          The site is provided &ldquo;as is&rdquo;, without warranties of any kind. We work to keep lessons
          accurate, but modding tools and games change constantly, and some information will inevitably go
          out of date or turn out to be wrong. We do not guarantee that the site will be available,
          uninterrupted, error-free, or that following a lesson will produce a particular result.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          To the fullest extent permitted by law, we are not liable for any loss or damage arising out of
          your use of the site or of any information on it — including damage to hardware, software, save
          data or accounts, loss of access to online services, or lost data. Some jurisdictions don&rsquo;t
          allow certain limitations, so parts of this section may not apply to you.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          We may update these terms as the site changes. The date at the top shows when they were last
          revised, and the full history of changes is public in the site&rsquo;s source repository.
          Continuing to use the site after a change means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms, or a request to remove something, can be raised in our{" "}
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--accent-medium)" }}
          >
            Discord server
          </a>{" "}
          or via the{" "}
          <Link href="/contact" className="underline" style={{ color: "var(--accent-medium)" }}>
            contact page
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
