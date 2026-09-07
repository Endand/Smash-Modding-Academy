"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Editable } from "@/components/editable-text";

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
            contentKey="contribute_body"
            fallback="Smash Modding Academy is built by the community, and there's always more to write. A full guide to contributing lessons, fixes and corrections is on the way. In the meantime, come say hello in the Discord."
            className="text-[15px] leading-relaxed text-[var(--text-muted)]"
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
