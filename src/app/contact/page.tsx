"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Editable } from "@/components/editable-text";
import { DISCORD_URL, GITHUB_URL } from "@/lib/support";

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-4">
            Support
          </p>
          <h1 className="text-4xl font-extralight tracking-wide text-[var(--text)] mb-5">
            <Editable as="span" contentKey="contact_title" fallback="Contact us" />
          </h1>
          <Editable
            as="p"
            contentKey="contact_body"
            fallback="The fastest way to reach us is the Discord server. That's where questions get answered, corrections get reported, and the people who write the lessons actually hang out."
            className="text-[15px] leading-relaxed text-[var(--text-muted)] mb-8"
          />

          <div className="flex flex-col gap-3">
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] transition-colors hover:underline"
              style={{ color: "var(--accent-medium)" }}
            >
              Join the Discord →
            </a>
            <a
              href={`${GITHUB_URL}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] transition-colors hover:underline"
              style={{ color: "var(--accent-medium)" }}
            >
              Report a problem on GitHub →
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
