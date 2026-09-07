import Link from "next/link";
import { Github, ArrowRight } from "lucide-react";
import { Editable } from "@/components/editable-text";
import { KOFI_URL } from "@/lib/support";

export function Footer() {
  return (
    <>
      {/* Support band — sits above the footer proper on every page that has a
          footer, on a slightly raised background so it reads as its own strip. */}
      <section
        className="px-6 py-14"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border-color)" }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-extralight tracking-wide text-[var(--text)] mb-4">
            <Editable as="span" contentKey="footer_support_title" fallback="Support us!" />
          </h2>
          <Editable
            as="p"
            contentKey="footer_support_body"
            fallback="Smash Modding Academy is funded by the community. Join us in keeping every lesson free for modders around the world!"
            className="text-[15px] leading-relaxed text-[var(--text-muted)] mb-7 max-w-lg mx-auto"
          />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/support"
              className="px-6 py-3 text-[14px] rounded-[var(--radius-button)] transition-colors hover:border-[var(--text-muted)]"
              style={{
                background: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--border-strong)",
              }}
            >
              Learn more
            </Link>
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-6 py-3 text-[14px] rounded-[var(--radius-button)] transition-transform hover:scale-[1.02]"
              style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
            >
              Donate now
              <ArrowRight size={15} strokeWidth={2} />
            </a>
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-extralight text-[var(--text-muted)]">
            Smash Modding Academy
          </span>
          <Editable
            contentKey="footer_tagline"
            fallback="Built with ❤️ for the Smash community"
            as="span"
            className="text-sm text-[var(--text-muted)]"
          />
          <a
            href="https://github.com/Endand/Smash-Academy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" strokeWidth={1.5} />
          </a>
        </div>
      </footer>
    </>
  );
}
