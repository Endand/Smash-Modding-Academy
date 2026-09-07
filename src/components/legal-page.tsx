import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

// Shared shell for Terms and Privacy. These are deliberately plain React
// rather than Editable content: a legal document should change through a
// reviewed commit with a date and a git history, not an inline text edit.
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: React.ReactNode;
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
            {title}
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] opacity-60 mb-8">
            Last updated {updated}
          </p>
          <p className="text-[15px] leading-relaxed text-[var(--text-muted)] mb-12">
            {intro}
          </p>
          <div className="flex flex-col gap-9">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[17px] font-light text-[var(--text)] mb-3">{heading}</h2>
      <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-[var(--text-muted)]">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2 pl-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="shrink-0 mt-[7px] w-1 h-1 rounded-full" style={{ background: "var(--accent-medium)" }} />
          <span className="flex-1">{it}</span>
        </li>
      ))}
    </ul>
  );
}
