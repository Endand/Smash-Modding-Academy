"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Editable } from "@/components/editable-text";
import { useContentContext } from "@/components/content-provider";
import { useAuth } from "@/components/auth-provider";
import type { CourseLessonDef } from "@/lib/courses/foundations-data";

interface Props {
  lesson: CourseLessonDef;
  prev: CourseLessonDef | null;
  next: CourseLessonDef | null;
}

export function LessonContent({ lesson, prev, next }: Props) {
  const { content, updateContent } = useContentContext();
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;

  const d = lesson.content!;
  const lk = lesson.lessonKey;

  // Dynamic section count — admin can add sections beyond the defaults
  const defaultSectionCount = d.sections.length;
  const sectionCount =
    parseInt(content[`${lk}_section_count`] ?? "", 10) || defaultSectionCount;

  type SectionEntry = {
    i: number;
    def: (typeof d.sections)[number] | undefined;
    paraCount: number;
  };
  const sections: SectionEntry[] = [];
  for (let i = 0; i < sectionCount; i++) {
    if (content[`${lk}_s${i}_deleted`] === "1") continue;
    const def = d.sections[i];
    const paraCount = def
      ? def.paragraphs.length
      : parseInt(content[`${lk}_s${i}_para_count`] ?? "", 10) || 1;
    sections.push({ i, def, paraCount });
  }

  const addSection = () => {
    const newIdx = sectionCount;
    updateContent(`${lk}_section_count`, String(newIdx + 1));
    updateContent(`${lk}_s${newIdx}_heading`, "New Section");
    updateContent(`${lk}_s${newIdx}_p0`, "Add your content here.");
    updateContent(`${lk}_s${newIdx}_para_count`, "1");
  };

  const deleteSection = (idx: number) => {
    updateContent(`${lk}_s${idx}_deleted`, "1");
  };

  const prevWithContent = prev?.content ? prev : null;
  const nextWithContent = next?.content ? next : null;

  // Title value (used in breadcrumb without making it a second editable)
  const titleValue = content[`${lk}_title`] ?? lesson.titleFallback;

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-14">

      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-10"
        aria-label="Breadcrumb"
      >
        <Link href="/curriculum" className="hover:text-[var(--text)] transition-colors">
          Curriculum
        </Link>
        <span className="opacity-30">/</span>
        <Link href="/courses/foundations" className="hover:text-[var(--text)] transition-colors">
          Foundations
        </Link>
        <span className="opacity-30">/</span>
        <span style={{ color: "var(--text)" }}>{titleValue}</span>
      </nav>

      {/* Title */}
      <h1 className="text-3xl font-extralight tracking-wide text-[var(--text)] mb-5 leading-tight">
        <Editable as="span" contentKey={`${lk}_title`} fallback={lesson.titleFallback} />
      </h1>

      {/* Introduction */}
      <Editable
        as="p"
        contentKey={`${lk}_intro`}
        fallback={d.introduction}
        className="leading-relaxed text-[15px] mb-10"
        style={{ color: "var(--text-muted)" }}
      />

      {/* Lesson Overview */}
      <div
        className="mb-12 px-5 pt-4 pb-5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-4">
          Lesson Overview
        </p>
        <ul className="flex flex-col gap-2.5">
          {d.outcomes.map((outcome, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-muted)]">
              <span className="shrink-0 mt-0.5" style={{ color: "var(--accent-medium)" }}>
                ▸
              </span>
              <Editable as="span" contentKey={`${lk}_outcome_${i}`} fallback={outcome} />
            </li>
          ))}
        </ul>
      </div>

      {/* Content Sections */}
      <div className="flex flex-col gap-10 mb-14">
        {sections.map(({ i, def, paraCount }) => (
          <section key={i} className="relative group/section">

            {/* Admin: delete section */}
            {isAdmin && (
              <button
                onClick={() => deleteSection(i)}
                title="Remove section"
                className="absolute -top-1 -right-2 opacity-0 group-hover/section:opacity-100 transition-opacity w-5 h-5 rounded-full flex items-center justify-center cursor-pointer z-10"
                style={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border-strong)",
                  color: "var(--text-muted)",
                }}
              >
                <X size={10} />
              </button>
            )}

            <h2 className="text-xl font-light text-[var(--text)] mb-4 tracking-tight">
              <Editable
                as="span"
                contentKey={`${lk}_s${i}_heading`}
                fallback={def?.heading ?? "New Section"}
              />
            </h2>

            <div className="flex flex-col gap-4">
              {Array.from({ length: paraCount }, (_, j) => (
                <Editable
                  key={j}
                  as="p"
                  contentKey={`${lk}_s${i}_p${j}`}
                  fallback={def?.paragraphs[j] ?? ""}
                  className="leading-relaxed text-[15px]"
                  style={{ color: "var(--text-muted)" }}
                />
              ))}
            </div>

            {/* Note — show if default has one or admin has set one */}
            {(def?.note || content[`${lk}_s${i}_note`]) && (
              <div
                className="mt-5 px-4 py-3 text-[13px] leading-relaxed"
                style={{
                  borderLeft: "3px solid var(--accent-medium)",
                  background: "var(--surface)",
                  color: "var(--text-muted)",
                  borderRadius: "0 var(--radius-card) var(--radius-card) 0",
                }}
              >
                <Editable
                  as="span"
                  contentKey={`${lk}_s${i}_note`}
                  fallback={def?.note ?? ""}
                />
              </div>
            )}
          </section>
        ))}

        {/* Admin: Add Section */}
        {isAdmin && (
          <button
            onClick={addSection}
            className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-mono uppercase tracking-widest cursor-pointer transition-colors w-full justify-center"
            style={{
              border: "1px dashed var(--border-strong)",
              borderRadius: "var(--radius-card)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; e.currentTarget.style.borderColor = "var(--accent-medium)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
          >
            <Plus size={12} />
            Add Section
          </button>
        )}
      </div>

      {/* Knowledge Check */}
      <div className="mb-14">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-5">
          Knowledge Check
        </p>
        <div className="flex flex-col gap-2">
          {d.knowledgeCheck.map((item, i) =>
            content[`${lk}_kc${i}_deleted`] === "1" ? null : (
              <details
                key={i}
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-card)",
                  overflow: "hidden",
                }}
              >
                <summary
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none text-[13px] hover:bg-[var(--surface-raised)] transition-colors select-none"
                  style={{ color: "var(--text)" }}
                >
                  <span
                    className="shrink-0 font-mono text-[9px] opacity-40 w-5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Editable as="span" contentKey={`${lk}_kc${i}_q`} fallback={item.question} />
                </summary>
                <div
                  className="px-4 py-3.5 text-[13px] leading-relaxed"
                  style={{
                    borderTop: "1px solid var(--border-color)",
                    background: "var(--surface)",
                    color: "var(--text-muted)",
                  }}
                >
                  <Editable as="span" contentKey={`${lk}_kc${i}_a`} fallback={item.answer} />
                </div>
              </details>
            )
          )}
        </div>
      </div>

      {/* Additional Resources */}
      {d.resources && d.resources.length > 0 && (
        <div className="mb-14">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-4">
            Additional Resources
          </p>
          <ul className="flex flex-col gap-3">
            {d.resources.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px]">
                <span className="shrink-0 mt-0.5" style={{ color: "var(--accent-medium)" }}>
                  →
                </span>
                <div>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: "var(--accent-medium)" }}
                  >
                    <Editable as="span" contentKey={`${lk}_res${i}_title`} fallback={r.title} />
                  </a>
                  <span style={{ color: "var(--text-muted)" }}> — </span>
                  <Editable
                    as="span"
                    contentKey={`${lk}_res${i}_desc`}
                    fallback={r.description}
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prev / Next navigation */}
      <div
        className="flex items-start justify-between gap-4 pt-8"
        style={{ borderTop: "1px solid var(--border-color)" }}
      >
        {prevWithContent ? (
          <Link
            href={`/courses/foundations/${prevWithContent.slug}`}
            className="flex items-center gap-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <ChevronLeft size={15} className="shrink-0" />
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest opacity-50 mb-0.5">
                Previous
              </div>
              <div>{prevWithContent.titleFallback}</div>
            </div>
          </Link>
        ) : (
          <div />
        )}
        {nextWithContent ? (
          <Link
            href={`/courses/foundations/${nextWithContent.slug}`}
            className="flex items-center gap-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-right"
          >
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest opacity-50 mb-0.5">
                Next
              </div>
              <div>{nextWithContent.titleFallback}</div>
            </div>
            <ChevronRight size={15} className="shrink-0" />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
