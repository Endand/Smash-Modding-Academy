"use client";

import { ArrowRight, Heart, BookOpen, Server, Users } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Editable } from "@/components/editable-text";
import { KOFI_URL } from "@/lib/support";

const REASONS = [
  {
    icon: <BookOpen size={16} strokeWidth={1.5} />,
    titleKey: "support_reason_1_title",
    titleFallback: "Free for everyone, forever",
    bodyKey: "support_reason_1_body",
    bodyFallback:
      "Every lesson, project and guide stays free to read. No paywalls, no accounts required, no ads. Donations are what make that possible.",
  },
  {
    icon: <Server size={16} strokeWidth={1.5} />,
    titleKey: "support_reason_2_title",
    titleFallback: "Keeping the lights on",
    bodyKey: "support_reason_2_body",
    bodyFallback:
      "Hosting, the domain, image storage and the tools behind the site all cost money every month. Your support covers those bills directly.",
  },
  {
    icon: <Users size={16} strokeWidth={1.5} />,
    titleKey: "support_reason_3_title",
    titleFallback: "More lessons, sooner",
    bodyKey: "support_reason_3_body",
    bodyFallback:
      "The curriculum is written and maintained by modders in their own time. Support means more hours spent writing new lessons and keeping old ones accurate.",
  },
];

export default function SupportPage() {
  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-4">
            Support us
          </p>

          <h1 className="text-4xl font-extralight tracking-wide text-[var(--text)] mb-5">
            <Editable
              as="span"
              contentKey="support_title"
              fallback="Help keep Smash Modding Academy free"
            />
          </h1>

          <Editable
            as="p"
            contentKey="support_intro"
            fallback="Smash Modding Academy is built and funded by the community. There's no company behind it, just modders writing down what they've figured out, so the next person doesn't have to work it out alone. If the site has saved you time, a donation helps keep it going."
            className="text-[15px] leading-relaxed text-[var(--text-muted)] mb-10"
          />

          {/* Primary call to action */}
          <div className="mb-14">
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 text-[15px] rounded-[var(--radius-button)] transition-transform hover:scale-[1.02]"
              style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
            >
              <Heart size={16} strokeWidth={2} />
              Donate now
              <ArrowRight size={16} strokeWidth={2} />
            </a>
          </div>

          {/* Where the money goes */}
          <div className="flex flex-col gap-8">
            {REASONS.map((r) => (
              <div key={r.titleKey} className="flex items-start gap-4">
                <span className="shrink-0 mt-0.5" style={{ color: "var(--accent-medium)" }}>
                  {r.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <Editable
                    as="h2"
                    contentKey={r.titleKey}
                    fallback={r.titleFallback}
                    className="text-[15px] text-[var(--text)] mb-1.5"
                  />
                  <Editable
                    as="p"
                    contentKey={r.bodyKey}
                    fallback={r.bodyFallback}
                    className="text-[14px] leading-relaxed text-[var(--text-muted)]"
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-14 pt-8 text-[13px] text-[var(--text-muted)]" style={{ borderTop: "1px solid var(--border-color)" }}>
            <Editable
              as="span"
              contentKey="support_outro"
              fallback="Can't donate? That's genuinely fine. Sharing a lesson with someone who's stuck, or reporting something that's wrong or out of date, helps just as much."
            />
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
