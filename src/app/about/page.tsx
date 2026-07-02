"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Editable } from "@/components/editable-text";

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="pt-14 min-h-[80vh] flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-4xl font-extralight text-[var(--text)] mb-4">
            About
          </h1>
          <Editable
            contentKey="about_body"
            fallback="Smash Modding Academy is a free, open-source learning platform for the Smash modding community."
            as="p"
            className="text-[var(--text-muted)]"
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
