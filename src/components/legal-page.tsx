"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Editable } from "@/components/editable-text";

// Shared shell for Terms and Privacy. Every heading, paragraph and bullet is
// an Editable with its own content key, so an admin can revise the wording in
// place. Keys are derived from position (terms_s2_b1_i3), so reordering the
// arrays below would re-point existing edits: add to the end instead.
export interface LegalBlock {
  type: "p" | "list";
  text?: string;
  items?: string[];
}

export interface LegalSectionDef {
  heading: string;
  blocks: LegalBlock[];
}

export function LegalPage({
  prefix,
  title,
  updated,
  intro,
  sections,
}: {
  prefix: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSectionDef[];
}) {
  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-20">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-4">
            Legal
          </p>
          <h1 className="text-4xl font-extralight tracking-wide text-[var(--text)] mb-3">
            <Editable as="span" contentKey={`${prefix}_title`} fallback={title} />
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] opacity-60 mb-8">
            Last updated{" "}
            <Editable as="span" contentKey={`${prefix}_updated`} fallback={updated} />
          </p>
          <Editable
            as="p"
            contentKey={`${prefix}_intro`}
            fallback={intro}
            className="text-[15px] leading-relaxed text-[var(--text-muted)] mb-12"
          />

          <div className="flex flex-col gap-9">
            {sections.map((sec, i) => (
              <section key={i}>
                <Editable
                  as="h2"
                  contentKey={`${prefix}_s${i}_heading`}
                  fallback={sec.heading}
                  className="text-[17px] font-light text-[var(--text)] mb-3"
                />
                <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-[var(--text-muted)]">
                  {sec.blocks.map((b, j) =>
                    b.type === "p" ? (
                      <Editable
                        key={j}
                        as="p"
                        contentKey={`${prefix}_s${i}_b${j}`}
                        fallback={b.text ?? ""}
                      />
                    ) : (
                      <ul key={j} className="flex flex-col gap-2 pl-1">
                        {(b.items ?? []).map((item, k) => (
                          <li key={k} className="flex gap-2.5">
                            <span
                              className="shrink-0 mt-[7px] w-1 h-1 rounded-full"
                              style={{ background: "var(--accent-medium)" }}
                            />
                            <Editable
                              as="span"
                              contentKey={`${prefix}_s${i}_b${j}_i${k}`}
                              fallback={item}
                              className="flex-1"
                            />
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
