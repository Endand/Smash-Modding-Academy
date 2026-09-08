"use client";

import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Editable } from "@/components/editable-text";
import { DISCORD_URL, GITHUB_URL } from "@/lib/support";

// The old placeholder copy lives under `contribute_body`, which this page no
// longer renders. New keys are used so the real copy below is what shows.
const WAYS = [
  {
    key: "contribute_report",
    heading: "Report something wrong",
    fallback:
      "This is the most useful thing you can do, and it takes a minute. Modding tools change constantly, so lessons go stale: a button gets renamed, a download moves, a step stops working. If something did not match what you saw on screen, say so in the Discord or open an issue on GitHub. Tell us which lesson, and what you expected to happen.",
  },
  {
    key: "contribute_suggest",
    heading: "Suggest a lesson",
    fallback:
      "If you got stuck on something and had to work it out yourself, that is a lesson worth writing. Tell us what you were trying to do and where the existing material let you down. Gaps that people actually hit are worth far more than topics that only sound thorough on paper.",
  },
  {
    key: "contribute_write",
    heading: "Write or edit lessons",
    fallback:
      "Lessons are written directly on the site, in place, with no build step and no pull request to file. Ask in the Discord and an admin can grant you edit access to a whole course or to a single lesson. You do not need to be an expert on everything, only on the part you are writing about.",
  },
  {
    key: "contribute_review",
    heading: "How edits get published",
    fallback:
      "Editors write freely, and their changes wait for approval from a professor or assistant on that lesson before going live. That is not a judgement on your work. It is how a site with many writers keeps one voice and stops mistakes reaching learners. Your pending changes stay visible to you on the lesson while they wait.",
  },
  {
    key: "contribute_other",
    heading: "If you do not want to write",
    fallback:
      "Answering questions in the Discord helps as much as writing does. So does sharing a lesson with someone who is stuck, running a guide on a fresh setup and reporting what broke, or covering some of the running costs so the site stays free to read.",
  },
];

export default function ContributePage() {
  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-4">
            Support
          </p>
          <h1 className="text-4xl font-extralight tracking-wide text-[var(--text)] mb-5">
            <Editable as="span" contentKey="contribute_title" fallback="Contribute" />
          </h1>
          <Editable
            as="p"
            contentKey="contribute_intro"
            fallback="Smash Modding Academy is written by the community, and there is always more to write. You do not need permission to help, and you do not need to be an expert. Here is what genuinely makes a difference, roughly in order of how much it helps."
            className="text-[15px] leading-relaxed text-[var(--text-muted)] mb-12"
          />

          <div className="flex flex-col gap-9">
            {WAYS.map((w) => (
              <section key={w.key}>
                <Editable
                  as="h2"
                  contentKey={`${w.key}_heading`}
                  fallback={w.heading}
                  className="text-[17px] font-light text-[var(--text)] mb-3"
                />
                <Editable
                  as="p"
                  contentKey={w.key}
                  fallback={w.fallback}
                  className="text-[14px] leading-relaxed text-[var(--text-muted)]"
                />
              </section>
            ))}
          </div>

          <div className="mt-14 pt-8 flex flex-col gap-2.5" style={{ borderTop: "1px solid var(--border-color)" }}>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] hover:underline"
              style={{ color: "var(--accent-medium)" }}
            >
              Join the Discord →
            </a>
            <a
              href={`${GITHUB_URL}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] hover:underline"
              style={{ color: "var(--accent-medium)" }}
            >
              Open an issue on GitHub →
            </a>
            <Link href="/support" className="text-[14px] hover:underline" style={{ color: "var(--accent-medium)" }}>
              Support the running costs →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
