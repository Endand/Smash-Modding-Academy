"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X, ChevronDown, Code, Image as ImageIcon, Quote } from "lucide-react";
import { Editable } from "@/components/editable-text";
import { useContentContext } from "@/components/content-provider";
import { useAuth } from "@/components/auth-provider";
import { useCourseStructure, getEffectiveStatus } from "@/hooks/use-course-structure";
import { getStaticLesson } from "@/lib/courses/foundations-data";
import { getCourseKeys, getCourseSlug } from "@/lib/courses/course-utils";

// ── Shared admin UI ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-5">
      {label}
    </p>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 flex items-center gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-widest cursor-pointer w-full justify-center transition-colors"
      style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)", color: "var(--text-muted)" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; e.currentTarget.style.borderColor = "var(--accent-medium)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
    >
      <Plus size={11} />
      {label}
    </button>
  );
}

function RemoveBtn({ onClick, title = "Remove" }: { onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
    >
      <X size={9} />
    </button>
  );
}

// ── Rich content block renderer ───────────────────────────────────────────────

type BlockType = "text" | "code" | "image" | "quote";

interface Block {
  j: number;
  type: BlockType;
}

function EditableTextarea({
  contentKey,
  fallback,
  className,
  style,
  mono,
}: {
  contentKey: string;
  fallback: string;
  className?: string;
  style?: React.CSSProperties;
  mono?: boolean;
}) {
  const { content, updateContent } = useContentContext();
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const value = content[contentKey] ?? fallback;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!isAdmin) {
    return (
      <pre
        className={`whitespace-pre-wrap break-words ${className ?? ""}`}
        style={{ fontFamily: mono ? "var(--font-jetbrains), monospace" : "inherit", ...style }}
      >
        {value}
      </pre>
    );
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft.trim() && draft !== value) updateContent(contentKey, draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setEditing(false); setDraft(value); }
        }}
        rows={Math.max(3, (draft.match(/\n/g)?.length ?? 0) + 2)}
        className={`w-full resize-none bg-transparent outline-none ${className ?? ""}`}
        style={{
          fontFamily: mono ? "var(--font-jetbrains), monospace" : "inherit",
          border: "1px solid var(--accent-medium)",
          borderRadius: "var(--radius-card)",
          padding: "0.5rem",
          ...style,
        }}
      />
    );
  }

  return (
    <pre
      onClick={() => { setEditing(true); setDraft(value); }}
      className={`whitespace-pre-wrap break-words cursor-text ${className ?? ""}`}
      style={{
        fontFamily: mono ? "var(--font-jetbrains), monospace" : "inherit",
        outline: "1px dashed transparent",
        borderRadius: "var(--radius-card)",
        transition: "outline-color 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.outlineColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.outlineColor = "transparent"; }}
    >
      {value || <span style={{ opacity: 0.3 }}>Click to edit…</span>}
    </pre>
  );
}

function BlockRenderer({
  block,
  lk,
  si,
  isAdmin,
  onRemove,
}: {
  block: Block;
  lk: string;
  si: number;
  isAdmin: boolean;
  onRemove: () => void;
}) {
  const { content, updateContent } = useContentContext();
  const prefix = `${lk}_s${si}_blk${block.j}`;
  const blockContent = content[`${prefix}_content`] ?? "";
  const lang = content[`${prefix}_lang`] ?? "";
  const caption = content[`${prefix}_caption`] ?? "";

  if (block.type === "text") {
    return (
      <div className="group relative">
        {isAdmin && (
          <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <RemoveBtn onClick={onRemove} title="Remove paragraph" />
          </div>
        )}
        <Editable
          as="p"
          contentKey={`${prefix}_content`}
          fallback="New paragraph…"
          className="leading-relaxed text-[15px]"
          style={{ color: "var(--text-muted)" }}
        />
      </div>
    );
  }

  if (block.type === "code") {
    return (
      <div className="group relative">
        {isAdmin && (
          <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <RemoveBtn onClick={onRemove} title="Remove code block" />
          </div>
        )}
        {isAdmin && (
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[9px] uppercase tracking-widest opacity-40" style={{ color: "var(--text-muted)" }}>
              Language:
            </span>
            <Editable
              as="span"
              contentKey={`${prefix}_lang`}
              fallback="plaintext"
              className="font-mono text-[10px]"
              style={{ color: "var(--text-muted)" }}
            />
          </div>
        )}
        {!isAdmin && lang && (
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[9px] uppercase tracking-widest opacity-40" style={{ color: "var(--text-muted)" }}>
              {lang}
            </span>
          </div>
        )}
        <div
          className="overflow-x-auto"
          style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)" }}
        >
          <EditableTextarea
            contentKey={`${prefix}_content`}
            fallback="// code here"
            mono
            className="text-[13px] leading-relaxed text-[var(--text-muted)] p-4"
          />
        </div>
      </div>
    );
  }

  if (block.type === "image") {
    const url = blockContent;
    return (
      <div className="group relative">
        {isAdmin && (
          <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <RemoveBtn onClick={onRemove} title="Remove image" />
          </div>
        )}
        {isAdmin && (
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[9px] uppercase tracking-widest opacity-40" style={{ color: "var(--text-muted)" }}>
              URL:
            </span>
            <Editable
              as="span"
              contentKey={`${prefix}_content`}
              fallback="https://example.com/image.png"
              className="font-mono text-[10px] flex-1 truncate"
              style={{ color: "var(--text-muted)" }}
            />
          </div>
        )}
        {url && url !== "https://example.com/image.png" ? (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={caption || ""}
              className="w-full rounded-[var(--radius-card)] object-cover"
              style={{ border: "1px solid var(--border-color)" }}
            />
            {(caption || isAdmin) && (
              <figcaption className="text-center mt-2 text-[12px]" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                <Editable as="span" contentKey={`${prefix}_caption`} fallback="Image caption (optional)" />
              </figcaption>
            )}
          </figure>
        ) : (
          <div
            className="flex items-center justify-center py-10 rounded-[var(--radius-card)]"
            style={{ border: "1px dashed var(--border-strong)", color: "var(--text-muted)", opacity: 0.4 }}
          >
            <ImageIcon size={24} strokeWidth={1} />
          </div>
        )}
      </div>
    );
  }

  if (block.type === "quote") {
    return (
      <div className="group relative">
        {isAdmin && (
          <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <RemoveBtn onClick={onRemove} title="Remove quote" />
          </div>
        )}
        <div
          className="px-4 py-3 text-[13px] leading-relaxed"
          style={{
            borderLeft: "3px solid var(--accent-medium)",
            background: "var(--surface)",
            color: "var(--text-muted)",
            borderRadius: "0 var(--radius-card) var(--radius-card) 0",
          }}
        >
          <Editable as="span" contentKey={`${prefix}_content`} fallback="Quote text here…" />
        </div>
      </div>
    );
  }

  return null;
}

// ── Add-block menu ────────────────────────────────────────────────────────────

function AddBlockMenu({
  onAdd,
}: {
  onAdd: (type: BlockType) => void;
}) {
  const [open, setOpen] = useState(false);

  const options: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: "text", label: "Paragraph", icon: <span className="font-mono text-[10px]">¶</span> },
    { type: "code", label: "Code Block", icon: <Code size={11} /> },
    { type: "image", label: "Image", icon: <ImageIcon size={11} /> },
    { type: "quote", label: "Quote", icon: <Quote size={11} /> },
  ];

  return (
    <div className="relative mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-widest cursor-pointer w-full justify-center transition-colors"
        style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)", color: "var(--text-muted)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; e.currentTarget.style.borderColor = "var(--accent-medium)"; }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-strong)"; } }}
      >
        <Plus size={11} /> Add Block
      </button>
      {open && (
        <div
          className="absolute left-1/2 -translate-x-1/2 mt-1 z-20 flex flex-col overflow-hidden"
          style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", background: "var(--surface)", minWidth: "140px" }}
        >
          {options.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => { onAdd(type); setOpen(false); }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-left cursor-pointer transition-colors hover:bg-[var(--surface-raised)]"
              style={{ color: "var(--text-muted)" }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Status control on lesson page ─────────────────────────────────────────────

const STATUSES = [
  { value: "published", label: "Published" },
  { value: "soon", label: "Soon" },
  { value: "draft", label: "Draft" },
] as const;

function LessonStatusBadge({ lessonKey, hasStaticContent }: { lessonKey: string; hasStaticContent: boolean }) {
  const { content, updateContent } = useContentContext();
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const status = getEffectiveStatus(lessonKey, hasStaticContent, content);

  if (!isAdmin) return null;

  return (
    <div className="relative inline-flex items-center">
      <select
        value={status}
        onChange={(e) => updateContent(`${lessonKey}_status`, e.target.value)}
        className="appearance-none font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 pr-6 rounded-[var(--radius-tag)] cursor-pointer bg-transparent outline-none"
        style={{
          color: status === "published" ? "var(--accent-medium)" : "var(--text-muted)",
          border: `1px solid ${status === "published" ? "var(--accent-medium)" : "var(--border-strong)"}`,
        }}
      >
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <ChevronDown size={8} className="absolute right-1 pointer-events-none" style={{ color: status === "published" ? "var(--accent-medium)" : "var(--text-muted)" }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  lessonKey: string;
  slug: string;
  courseId?: string;
}

export function LessonContent({ lessonKey, slug, courseId = "foundations" }: Props) {
  const { content, updateContent } = useContentContext();
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const { allLessons } = useCourseStructure(courseId);

  // Static lesson data for fallbacks (only exists for foundations lessons)
  const staticLesson = getStaticLesson(lessonKey);
  const d = staticLesson?.content ?? null;
  const lk = lessonKey;

  // Lesson status
  const status = getEffectiveStatus(lk, !!d, content);
  const courseTitle = content[getCourseKeys(courseId).titleKey] ?? "Course";
  const courseSlug = getCourseSlug(courseId, content);

  // Prev / Next from live structure
  const currentIdx = allLessons.findIndex((l) => l.slug === slug);
  const prev = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const next = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  const isAccessiblePrev = prev && (getEffectiveStatus(prev.lessonKey, prev.hasStaticContent, content) === "published" || isAdmin);
  const isAccessibleNext = next && (getEffectiveStatus(next.lessonKey, next.hasStaticContent, content) === "published" || isAdmin);

  // ── Outcomes ─────────────────────────────────────────────────────────────
  const defaultOutcomeCount = d?.outcomes.length ?? 0;
  const outcomeCount = parseInt(content[`${lk}_outcome_count`] ?? "", 10) || defaultOutcomeCount;
  const outcomes: { i: number; fallback: string }[] = [];
  for (let i = 0; i < outcomeCount; i++) {
    if (content[`${lk}_outcome_${i}_deleted`] === "1") continue;
    outcomes.push({ i, fallback: d?.outcomes[i] ?? "" });
  }
  const addOutcome = () => {
    const idx = outcomeCount;
    updateContent(`${lk}_outcome_count`, String(idx + 1));
    updateContent(`${lk}_outcome_${idx}`, "New learning outcome");
  };
  const deleteOutcome = (idx: number) => updateContent(`${lk}_outcome_${idx}_deleted`, "1");

  // ── Main Sections ─────────────────────────────────────────────────────────
  const defaultSectionCount = d?.sections.length ?? 0;
  const sectionCount = parseInt(content[`${lk}_section_count`] ?? "", 10) || defaultSectionCount;
  type SectionEntry = { i: number; def: (typeof d extends null ? never : NonNullable<typeof d>["sections"][number]) | undefined; paraCount: number; blkCount: number };
  const sections: SectionEntry[] = [];
  for (let i = 0; i < sectionCount; i++) {
    if (content[`${lk}_s${i}_deleted`] === "1") continue;
    const def = d?.sections[i];
    const paraCount = def
      ? def.paragraphs.length
      : parseInt(content[`${lk}_s${i}_para_count`] ?? "", 10) || 1;
    const blkCount = parseInt(content[`${lk}_s${i}_blk_count`] ?? "", 10) || 0;
    sections.push({ i, def, paraCount, blkCount });
  }
  const addSection = () => {
    const idx = sectionCount;
    updateContent(`${lk}_section_count`, String(idx + 1));
    updateContent(`${lk}_s${idx}_heading`, "New Section");
    updateContent(`${lk}_s${idx}_p0`, "Add your content here.");
    updateContent(`${lk}_s${idx}_para_count`, "1");
  };
  const deleteSection = (idx: number) => updateContent(`${lk}_s${idx}_deleted`, "1");

  const addBlock = (si: number, currentBlkCount: number, type: BlockType) => {
    const j = currentBlkCount;
    updateContent(`${lk}_s${si}_blk_count`, String(j + 1));
    updateContent(`${lk}_s${si}_blk${j}_type`, type);
    if (type === "text") updateContent(`${lk}_s${si}_blk${j}_content`, "New paragraph…");
    if (type === "code") { updateContent(`${lk}_s${si}_blk${j}_content`, "// code here"); updateContent(`${lk}_s${si}_blk${j}_lang`, "plaintext"); }
    if (type === "image") updateContent(`${lk}_s${si}_blk${j}_content`, "");
    if (type === "quote") updateContent(`${lk}_s${si}_blk${j}_content`, "Quote text here…");
  };
  const deleteBlock = (si: number, j: number) => updateContent(`${lk}_s${si}_blk${j}_deleted`, "1");
  const deleteParag = (si: number, j: number) => updateContent(`${lk}_s${si}_p${j}_deleted`, "1");

  // ── Assignment ────────────────────────────────────────────────────────────
  const defaultAssignCount = d?.assignment?.items.length ?? 0;
  const assignCount = parseInt(content[`${lk}_assign_count`] ?? "", 10) || defaultAssignCount;
  const assignItems: { i: number; fallback: string }[] = [];
  for (let i = 0; i < assignCount; i++) {
    if (content[`${lk}_assign_${i}_deleted`] === "1") continue;
    assignItems.push({ i, fallback: d?.assignment?.items[i] ?? "" });
  }
  const addAssignItem = () => {
    const idx = assignCount;
    updateContent(`${lk}_assign_count`, String(idx + 1));
    updateContent(`${lk}_assign_${idx}`, "Complete this task.");
  };
  const deleteAssignItem = (idx: number) => updateContent(`${lk}_assign_${idx}_deleted`, "1");

  // ── Knowledge Check ───────────────────────────────────────────────────────
  const defaultKCCount = d?.knowledgeCheck.length ?? 0;
  const kcCount = parseInt(content[`${lk}_kc_count`] ?? "", 10) || defaultKCCount;
  type KCEntry = { i: number; defQ: string; defA: string };
  const kcItems: KCEntry[] = [];
  for (let i = 0; i < kcCount; i++) {
    if (content[`${lk}_kc${i}_deleted`] === "1") continue;
    kcItems.push({ i, defQ: d?.knowledgeCheck[i]?.question ?? "", defA: d?.knowledgeCheck[i]?.answer ?? "" });
  }
  const addKCItem = () => {
    const idx = kcCount;
    updateContent(`${lk}_kc_count`, String(idx + 1));
    updateContent(`${lk}_kc${idx}_q`, "New question");
    updateContent(`${lk}_kc${idx}_a`, "Answer goes here.");
  };
  const deleteKCItem = (idx: number) => updateContent(`${lk}_kc${idx}_deleted`, "1");

  // ── Resources ─────────────────────────────────────────────────────────────
  const defaultResCount = d?.resources?.length ?? 0;
  const resCount = parseInt(content[`${lk}_res_count`] ?? "", 10) || defaultResCount;
  type ResEntry = { i: number; defTitle: string; defUrl: string; defDesc: string };
  const resItems: ResEntry[] = [];
  for (let i = 0; i < resCount; i++) {
    if (content[`${lk}_res${i}_deleted`] === "1") continue;
    resItems.push({ i, defTitle: d?.resources?.[i]?.title ?? "", defUrl: d?.resources?.[i]?.url ?? "https://example.com", defDesc: d?.resources?.[i]?.description ?? "" });
  }
  const addResource = () => {
    const idx = resCount;
    updateContent(`${lk}_res_count`, String(idx + 1));
    updateContent(`${lk}_res${idx}_title`, "Resource Title");
    updateContent(`${lk}_res${idx}_url`, "https://example.com");
    updateContent(`${lk}_res${idx}_desc`, "Description of this resource.");
  };
  const deleteResource = (idx: number) => updateContent(`${lk}_res${idx}_deleted`, "1");

  // ── "Coming Soon" gate for non-admins ────────────────────────────────────
  if (status !== "published" && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-20 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-4">
          {status === "draft" ? "Not published" : "Coming soon"}
        </p>
        <h1 className="text-2xl font-extralight text-[var(--text)] mb-4">
          {content[`${lk}_title`] ?? staticLesson?.titleFallback ?? "Lesson"}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          This lesson isn't available yet. Check back soon.
        </p>
        <Link href={`/courses/${courseSlug}`} className="inline-block mt-6 font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent-medium)" }}>
          ← Back to {courseTitle}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-14">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-10" aria-label="Breadcrumb">
        <Link href="/curriculum" className="hover:text-[var(--text)] transition-colors">Curriculum</Link>
        <span className="opacity-30">/</span>
        <Link href={`/courses/${courseSlug}`} className="hover:text-[var(--text)] transition-colors">{courseTitle}</Link>
        <span className="opacity-30">/</span>
        <span style={{ color: "var(--text)" }}>{content[`${lk}_title`] ?? staticLesson?.titleFallback}</span>
      </nav>

      {/* Title + status badge */}
      <div className="flex items-start gap-3 mb-5">
        <h1 className="text-3xl font-extralight tracking-wide text-[var(--text)] leading-tight flex-1">
          <Editable as="span" contentKey={`${lk}_title`} fallback={staticLesson?.titleFallback ?? "Untitled Lesson"} />
        </h1>
        <LessonStatusBadge lessonKey={lk} hasStaticContent={!!d} />
      </div>

      {/* Introduction */}
      <Editable
        as="p"
        contentKey={`${lk}_intro`}
        fallback={d?.introduction ?? ""}
        className="leading-relaxed text-[15px] mb-12"
        style={{ color: "var(--text-muted)" }}
      />

      {/* ── Lesson Overview ──────────────────────────────── */}
      <div className="mb-12 px-5 pt-4 pb-5" style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)" }}>
        <SectionLabel label="Lesson Overview" />
        <ul className="flex flex-col gap-2.5">
          {outcomes.map(({ i, fallback }) => (
            <li key={i} className="group flex items-start gap-2 text-sm text-[var(--text-muted)]">
              <span className="shrink-0 mt-0.5" style={{ color: "var(--accent-medium)" }}>▸</span>
              <Editable as="span" contentKey={`${lk}_outcome_${i}`} fallback={fallback} className="flex-1" />
              {isAdmin && <RemoveBtn onClick={() => deleteOutcome(i)} title="Remove outcome" />}
            </li>
          ))}
        </ul>
        {isAdmin && <AddBtn label="Add Outcome" onClick={addOutcome} />}
      </div>

      {/* ── Main Sections ────────────────────────────────── */}
      <div className="flex flex-col gap-10 mb-14">
        {sections.map(({ i, def, paraCount, blkCount }) => {
          // Build extra blocks list
          const blocks: Block[] = [];
          for (let j = 0; j < blkCount; j++) {
            if (content[`${lk}_s${i}_blk${j}_deleted`] === "1") continue;
            const type = (content[`${lk}_s${i}_blk${j}_type`] ?? "text") as BlockType;
            blocks.push({ j, type });
          }

          return (
            <section key={i} className="group relative">
              {isAdmin && (
                <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <RemoveBtn onClick={() => deleteSection(i)} title="Remove section" />
                </div>
              )}
              <h2 className="text-xl font-light text-[var(--text)] mb-4 tracking-tight">
                <Editable as="span" contentKey={`${lk}_s${i}_heading`} fallback={def?.heading ?? "New Section"} />
              </h2>
              <div className="flex flex-col gap-4">
                {/* Original paragraphs */}
                {Array.from({ length: paraCount }, (_, j) => {
                  if (content[`${lk}_s${i}_p${j}_deleted`] === "1") return null;
                  return (
                    <div key={j} className="group/p relative">
                      {isAdmin && (
                        <div className="absolute -top-1 -right-1 opacity-0 group-hover/p:opacity-100 transition-opacity z-10">
                          <RemoveBtn onClick={() => deleteParag(i, j)} title="Remove paragraph" />
                        </div>
                      )}
                      <Editable
                        as="p"
                        contentKey={`${lk}_s${i}_p${j}`}
                        fallback={def?.paragraphs[j] ?? ""}
                        className="leading-relaxed text-[15px]"
                        style={{ color: "var(--text-muted)" }}
                      />
                    </div>
                  );
                })}

                {/* Rich content blocks */}
                {blocks.map((block) => (
                  <BlockRenderer
                    key={block.j}
                    block={block}
                    lk={lk}
                    si={i}
                    isAdmin={isAdmin}
                    onRemove={() => deleteBlock(i, block.j)}
                  />
                ))}
              </div>

              {/* Existing note / quote */}
              {(def?.note || content[`${lk}_s${i}_note`]) && content[`${lk}_s${i}_note_deleted`] !== "1" && (
                <div className="group/note relative mt-5">
                  {isAdmin && (
                    <div className="absolute -top-1 -right-1 opacity-0 group-hover/note:opacity-100 transition-opacity z-10">
                      <RemoveBtn onClick={() => updateContent(`${lk}_s${i}_note_deleted`, "1")} title="Remove callout" />
                    </div>
                  )}
                  <div
                    className="px-4 py-3 text-[13px] leading-relaxed"
                    style={{ borderLeft: "3px solid var(--accent-medium)", background: "var(--surface)", color: "var(--text-muted)", borderRadius: "0 var(--radius-card) var(--radius-card) 0" }}
                  >
                    <Editable as="span" contentKey={`${lk}_s${i}_note`} fallback={def?.note ?? ""} />
                  </div>
                </div>
              )}

              {isAdmin && (
                <AddBlockMenu onAdd={(type) => addBlock(i, blkCount, type)} />
              )}
            </section>
          );
        })}
        {isAdmin && <AddBtn label="Add Section" onClick={addSection} />}
      </div>

      {/* ── Assignment ───────────────────────────────────── */}
      <div className="mb-14">
        <SectionLabel label="Assignment" />
        {assignItems.length > 0 ? (
          <>
            <Editable
              as="p"
              contentKey={`${lk}_assign_desc`}
              fallback={d?.assignment?.description ?? "Before moving on, complete the following tasks."}
              className="text-[14px] leading-relaxed mb-4"
              style={{ color: "var(--text-muted)" }}
            />
            <ul className="flex flex-col gap-3">
              {assignItems.map(({ i, fallback }) => (
                <li key={i} className="group flex items-start gap-3 text-[14px]">
                  <span className="shrink-0 mt-[7px] w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent-medium)" }} />
                  <Editable as="span" contentKey={`${lk}_assign_${i}`} fallback={fallback} className="flex-1 leading-relaxed" style={{ color: "var(--text-muted)" }} />
                  {isAdmin && <RemoveBtn onClick={() => deleteAssignItem(i)} title="Remove task" />}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
            There is no assignment for this lesson.
          </p>
        )}
        {isAdmin && <AddBtn label="Add Task" onClick={addAssignItem} />}
      </div>

      {/* ── Knowledge Check ──────────────────────────────── */}
      <div className="mb-14">
        <SectionLabel label="Knowledge Check" />
        {kcItems.length > 0 ? (
          <div className="flex flex-col gap-2">
            {kcItems.map(({ i, defQ, defA }, displayIdx) => (
              <div key={i} className="group relative">
                {isAdmin && (
                  <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <RemoveBtn onClick={() => deleteKCItem(i)} title="Remove question" />
                  </div>
                )}
                <details style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
                  <summary className="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none text-[13px] hover:bg-[var(--surface-raised)] transition-colors select-none" style={{ color: "var(--text)" }}>
                    <span className="shrink-0 font-mono text-[9px] opacity-40 w-5" style={{ color: "var(--text-muted)" }}>
                      {String(displayIdx + 1).padStart(2, "0")}
                    </span>
                    <Editable as="span" contentKey={`${lk}_kc${i}_q`} fallback={defQ} />
                  </summary>
                  <div className="px-4 py-3.5 text-[13px] leading-relaxed" style={{ borderTop: "1px solid var(--border-color)", background: "var(--surface)", color: "var(--text-muted)" }}>
                    <Editable as="span" contentKey={`${lk}_kc${i}_a`} fallback={defA} />
                  </div>
                </details>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
            There is no knowledge check for this lesson.
          </p>
        )}
        {isAdmin && <AddBtn label="Add Question" onClick={addKCItem} />}
      </div>

      {/* ── Additional Resources ─────────────────────────── */}
      <div className="mb-14">
        <SectionLabel label="Additional Resources" />
        {resItems.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {resItems.map(({ i, defTitle, defUrl, defDesc }) => {
              const url = content[`${lk}_res${i}_url`] ?? defUrl;
              const isNew = i >= defaultResCount;
              return (
                <li key={i} className="group flex items-start gap-2.5 text-[13px]">
                  <span className="shrink-0 mt-0.5" style={{ color: "var(--accent-medium)" }}>→</span>
                  <div className="flex-1 min-w-0">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--accent-medium)" }}>
                      <Editable as="span" contentKey={`${lk}_res${i}_title`} fallback={defTitle} />
                    </a>
                    <span style={{ color: "var(--text-muted)" }}> — </span>
                    <Editable as="span" contentKey={`${lk}_res${i}_desc`} fallback={defDesc} style={{ color: "var(--text-muted)" }} />
                    {isAdmin && isNew && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 shrink-0" style={{ color: "var(--text-muted)" }}>URL:</span>
                        <Editable as="span" contentKey={`${lk}_res${i}_url`} fallback={defUrl} className="font-mono text-[10px] truncate" style={{ color: "var(--text-muted)" }} />
                      </div>
                    )}
                  </div>
                  {isAdmin && <RemoveBtn onClick={() => deleteResource(i)} title="Remove resource" />}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
            There are no additional resources for this lesson.
          </p>
        )}
        {isAdmin && <AddBtn label="Add Resource" onClick={addResource} />}
      </div>

      {/* Prev / Next navigation */}
      <div className="flex items-start justify-between gap-4 pt-8" style={{ borderTop: "1px solid var(--border-color)" }}>
        {isAccessiblePrev ? (
          <Link href={`/courses/${courseSlug}/${prev!.slug}`} className="flex items-center gap-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <ChevronLeft size={15} className="shrink-0" />
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest opacity-50 mb-0.5">Previous</div>
              <div>{content[`${prev!.lessonKey}_title`] ?? prev!.titleFallback}</div>
            </div>
          </Link>
        ) : <div />}
        {isAccessibleNext ? (
          <Link href={`/courses/${courseSlug}/${next!.slug}`} className="flex items-center gap-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-right">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest opacity-50 mb-0.5">Next</div>
              <div>{content[`${next!.lessonKey}_title`] ?? next!.titleFallback}</div>
            </div>
            <ChevronRight size={15} className="shrink-0" />
          </Link>
        ) : <div />}
      </div>
    </div>
  );
}
