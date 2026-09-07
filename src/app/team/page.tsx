"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Editable } from "@/components/editable-text";

export default function TeamPage() {
  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-4">
            About us
          </p>
          <h1 className="text-4xl font-extralight tracking-wide text-[var(--text)] mb-5">
            <Editable as="span" contentKey="team_title" fallback="The team" />
          </h1>
          <Editable
            as="p"
            contentKey="team_body"
            fallback="Smash Modding Academy is written and maintained by modders from across the community. This page is still being put together. Check back soon to meet the people behind the lessons."
            className="text-[15px] leading-relaxed text-[var(--text-muted)]"
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
