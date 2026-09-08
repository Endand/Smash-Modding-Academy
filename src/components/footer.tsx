import Link from "next/link";
import { Github, ArrowRight } from "lucide-react";
import { Editable } from "@/components/editable-text";
import { KOFI_URL, DISCORD_URL, GITHUB_URL } from "@/lib/support";

// lucide has no Discord glyph, so the brand mark is inlined.
function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "About Us",
    links: [
      { label: "About", href: "/about" },
      { label: "Team", href: "/team" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contribute", href: "/contribute" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

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

      <footer className="py-14 px-6" style={{ borderTop: "1px solid var(--border-color)" }}>
        {/* Four columns rather than the brand at one edge and the links pushed
            to the other, which left a gap down the middle. The brand column is
            wider so the name and social icons sit clear of the link columns,
            which stay evenly spaced among themselves. */}
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-x-8 gap-y-10">
          {/* Brand + socials */}
          <div className="col-span-2 md:col-span-1 md:pr-8">
            <span className="block text-base font-extralight tracking-wide text-[var(--text)] mb-4">
              Smash Modding Academy
            </span>
            <div className="flex items-center gap-4">
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                aria-label="Discord"
                title="Join the Discord"
              >
                <DiscordIcon size={20} />
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                aria-label="GitHub"
                title="Source on GitHub"
              >
                <Github className="w-5 h-5" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text)] mb-3">
                {col.title}
              </p>
              <ul className="flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>
    </>
  );
}
