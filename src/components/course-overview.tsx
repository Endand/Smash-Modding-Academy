"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X, ChevronDown } from "lucide-react";
import { Editable } from "@/components/editable-text";
import { EditableIcon } from "@/components/editable-icon";
import { useContentContext } from "@/components/content-provider";
import { useAuth } from "@/components/auth-provider";
import {
  useCourseStructure,
  getEffectiveStatus,
  parseJSON,
  type LiveLesson,
  type LiveSection,
} from "@/hooks/use-course-structure";
import { getCourseKeys, getCourseSlug, getCourseStatus } from "@/lib/courses/course-utils";

const PROJECT_ICONS = new Set(["Wrench", "Hammer", "Package", "Target", "Trophy"]);
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const STATUSES = [
  { value: "published", label: "Published", color: "var(--accent-medium)" },
  { value: "soon",      label: "Soon",      color: "var(--text-muted)" },
  { value: "draft",     label: "Draft",     color: "var(--text-muted)" },
] as const;

// ── Level badge / dropdown ────────────────────────────────────────────────────

function LevelBadge({ courseId }: { courseId: string }) {
  const { content, updateContent } = useContentContext();
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const { levelKey } = getCourseKeys(courseId);
  const level = content[levelKey] ?? "Beginner";

  if (!isAdmin) {
    return (
      <span
        className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-tag)]"
        style={{ color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }}
      >
        {level}
      </span>
    );
  }
  return (
    <div className="relative inline-flex items-center">
      <select
        value={level}
        onChange={(e) => updateContent(levelKey, e.target.value)}
        className="appearance-none font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 pr-6 rounded-[var(--radius-tag)] cursor-pointer bg-transparent outline-none"
        style={{ color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }}
      >
        {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <ChevronDown size={9} className="absolute right-1.5 pointer-events-none" style={{ color: "var(--accent-medium)" }} />
    </div>
  );
}

// ── Lesson status dropdown ────────────────────────────────────────────────────

function StatusControl({ lessonKey, hasStaticContent }: { lessonKey: string; hasStaticContent: boolean }) {
  const { content, updateContent } = useContentContext();
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const status = getEffectiveStatus(lessonKey, hasStaticContent, content);

  if (!isAdmin) {
    if (status === "published") return (
      <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--accent-medium)" }}>Start →</span>
    );
    if (status === "draft") return null;
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)", opacity: 0.4 }}>Soon</span>
    );
  }

  const current = STATUSES.find((s) => s.value === status) ?? STATUSES[0];
  return (
    <div className="relative inline-flex items-center">
      <select
        value={status}
        onChange={(e) => updateContent(`${lessonKey}_status`, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="appearance-none font-mono text-[10px] uppercase tracking-widest pr-4 pl-1 py-0.5 rounded cursor-pointer bg-transparent outline-none"
        style={{ color: current.color, border: `1px solid ${current.color}`, opacity: 0.85 }}
      >
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <ChevronDown size={9} className="absolute right-0.5 pointer-events-none" style={{ color: current.color }} />
    </div>
  );
}

// ── Lesson row ────────────────────────────────────────────────────────────────

function LessonRow({
  lesson, courseSlug, isLast, onRemove,
}: {
  lesson: LiveLesson;
  courseSlug: string;
  isLast: boolean;
  onRemove: () => void;
}) {
  const { content } = useContentContext();
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const iconName = content[`${lesson.lessonKey}_icon`] ?? lesson.iconFallback;
  const isProject = PROJECT_ICONS.has(iconName);
  const status = getEffectiveStatus(lesson.lessonKey, lesson.hasStaticContent, content);
  const isAccessible = status === "published" || isAdmin;

  if (status === "draft" && !isAdmin) return null;

  const inner = (
    <div
      className={`group flex items-center gap-4 px-5 py-4 transition-colors ${
        isAccessible ? "hover:bg-[var(--surface-raised)] cursor-pointer" : "cursor-default"
      }`}
      style={{ borderBottom: !isLast ? "1px solid var(--border-color)" : "none" }}
    >
      <span style={{ color: isProject ? "var(--accent-medium)" : "var(--text-muted)", opacity: isProject ? 1 : 0.6, flexShrink: 0 }}>
        <EditableIcon contentKey={`${lesson.lessonKey}_icon`} fallback={lesson.iconFallback} size={15} strokeWidth={1.5} />
      </span>
      <Editable
        as="span"
        contentKey={`${lesson.lessonKey}_title`}
        fallback={lesson.titleFallback}
        className="flex-1 text-sm"
        style={{ color: status === "draft" ? "var(--text-muted)" : "var(--text)", opacity: status === "draft" ? 0.5 : 1 }}
      />
      {isProject && (
        <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-tag)] hidden sm:inline" style={{ color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }}>
          Project
        </span>
      )}
      <StatusControl lessonKey={lesson.lessonKey} hasStaticContent={lesson.hasStaticContent} />
      {isAdmin && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          title="Remove lesson"
          className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ml-1"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
        >
          <X size={9} />
        </button>
      )}
    </div>
  );

  return isAccessible ? (
    <Link href={`/courses/${courseSlug}/${lesson.slug}`} className="block">{inner}</Link>
  ) : inner;
}

// ── Add lesson button ─────────────────────────────────────────────────────────

function AddLessonBtn({ courseId, section }: { courseId: string; section: LiveSection }) {
  const { content, updateContent } = useContentContext();

  const handleAdd = () => {
    const ts = Date.now();
    const lId = `ldyn_${ts}`;
    const lk = `${courseId}_${lId}`;
    const short = ts.toString().slice(-6);
    const slug = `new-lesson-${short}`;

    const currentIds: string[] = parseJSON(
      content[`${section.sectionKey}_lesson_ids`],
      section.lessons.map((l) => l.lessonKey.replace(`${courseId}_`, ""))
    );
    updateContent(`${section.sectionKey}_lesson_ids`, JSON.stringify([...currentIds, lId]));
    updateContent(`${lk}_title`, "New Lesson");
    updateContent(`${lk}_status`, "draft");
    updateContent(`${lk}_icon`, "BookOpen");
    updateContent(`${lk}_slug`, slug);

    const slugMap: Record<string, string> = parseJSON(content[`${courseId}_slug_map`], {});
    updateContent(`${courseId}_slug_map`, JSON.stringify({ ...slugMap, [slug]: lk }));
  };

  return (
    <button
      onClick={handleAdd}
      className="w-full flex items-center justify-center gap-1.5 px-4 py-2 font-mono text-[10px] uppercase tracking-widest cursor-pointer transition-colors"
      style={{ borderTop: "1px dashed var(--border-strong)", color: "var(--text-muted)" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
    >
      <Plus size={10} /> Add Lesson
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CourseOverview({ courseId }: { courseId: string }) {
  const { content, updateContent } = useContentContext();
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const { sections, allLessons } = useCourseStructure(courseId);
  const { titleKey, descKey } = getCourseKeys(courseId);
  const courseSlug = getCourseSlug(courseId, content);
  const courseStatus = getCourseStatus(courseId, content);

  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  const lessonCount = allLessons.filter((l) => !PROJECT_ICONS.has(content[`${l.lessonKey}_icon`] ?? l.iconFallback)).length;
  const projectCount = allLessons.filter((l) => PROJECT_ICONS.has(content[`${l.lessonKey}_icon`] ?? l.iconFallback)).length;

  const addSection = () => {
    const name = newSectionName.trim() || "New Section";
    const ts = Date.now();
    const sId = `sdyn_${ts}`;
    const sectionKey = `${courseId}_${sId}`;
    const currentIds: string[] = parseJSON(
      content[`${courseId}_section_ids`],
      sections.map((s) => s.sectionId)
    );
    updateContent(`${courseId}_section_ids`, JSON.stringify([...currentIds, sId]));
    updateContent(`${sectionKey}_title`, name);
    updateContent(`${sectionKey}_lesson_ids`, "[]");
    setNewSectionName("");
    setAddingSection(false);
  };

  const removeSection = (section: LiveSection) => updateContent(`${section.sectionKey}_deleted`, "1");
  const removeLesson  = (lesson: LiveLesson)  => updateContent(`${lesson.lessonKey}_deleted`, "1");

  // Non-admins see "Coming Soon" for unavailable courses
  if (courseStatus !== "available" && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-4">Coming soon</p>
        <h1 className="text-3xl font-extralight text-[var(--text)] mb-4">
          {content[titleKey] ?? "Course"}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">This course isn't available yet. Check back soon.</p>
        <Link href="/curriculum" className="inline-block mt-6 font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent-medium)" }}>
          ← Curriculum
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">

      {/* Course header */}
      <div className="mb-14">
        <div className="flex items-center gap-2 mb-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)]">Course</p>
          {isAdmin && (
            <div className="relative inline-flex items-center ml-2">
              <select
                value={courseStatus}
                onChange={(e) => updateContent(`course_${courseId}_status`, e.target.value)}
                className="appearance-none font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 pr-5 rounded-[var(--radius-tag)] cursor-pointer bg-transparent outline-none"
                style={{
                  color: courseStatus === "available" ? "var(--accent-medium)" : "var(--text-muted)",
                  border: `1px solid ${courseStatus === "available" ? "var(--accent-medium)" : "var(--border-strong)"}`,
                }}
              >
                <option value="available">Available</option>
                <option value="soon">Coming Soon</option>
              </select>
              <ChevronDown size={8} className="absolute right-1 pointer-events-none" style={{ color: courseStatus === "available" ? "var(--accent-medium)" : "var(--text-muted)" }} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mb-5">
          <Editable contentKey={titleKey} fallback="Course Title" as="h1" className="text-4xl font-extralight tracking-wide text-[var(--text)]" />
          <LevelBadge courseId={courseId} />
        </div>
        <Editable contentKey={descKey} fallback="Description of this course." as="p" className="text-[var(--text-muted)] leading-relaxed" />
        <div className="mt-5 font-mono text-[11px] flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
          <span>{lessonCount} lessons</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{projectCount} projects</span>
        </div>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-10">
        {sections.map((section) => (
          <div key={section.sectionKey} className="group/section">
            <div className="flex items-center gap-4 mb-3">
              <Editable
                as="span"
                contentKey={`${section.sectionKey}_title`}
                fallback={section.titleFallback}
                className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] whitespace-nowrap"
              />
              <div className="h-px flex-1 bg-[var(--border-color)]" />
              {isAdmin && (
                <button
                  onClick={() => removeSection(section)}
                  title="Remove section"
                  className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover/section:opacity-60 hover:!opacity-100 transition-opacity"
                  style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
                >
                  <X size={9} />
                </button>
              )}
            </div>
            <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
              {section.lessons.map((lesson, i) => (
                <LessonRow
                  key={lesson.lessonKey}
                  lesson={lesson}
                  courseSlug={courseSlug}
                  isLast={i === section.lessons.length - 1 && !isAdmin}
                  onRemove={() => removeLesson(lesson)}
                />
              ))}
              {isAdmin && <AddLessonBtn courseId={courseId} section={section} />}
            </div>
          </div>
        ))}
      </div>

      {/* Add Section */}
      {isAdmin && (
        <div className="mt-8">
          {addingSection ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addSection();
                  if (e.key === "Escape") { setAddingSection(false); setNewSectionName(""); }
                }}
                placeholder="Section name"
                className="flex-1 px-3 py-2 text-sm font-mono bg-transparent outline-none"
                style={{ border: "1px solid var(--border-strong)", borderRadius: "var(--radius-button)", color: "var(--text)" }}
              />
              <button onClick={addSection} className="px-4 py-2 text-[11px] font-mono uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)]" style={{ background: "var(--accent)", color: "#fff" }}>
                Add
              </button>
              <button onClick={() => { setAddingSection(false); setNewSectionName(""); }} className="px-3 py-2 text-[11px] font-mono uppercase tracking-widest cursor-pointer" style={{ color: "var(--text-muted)" }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingSection(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 font-mono text-[10px] uppercase tracking-widest cursor-pointer transition-colors"
              style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)", color: "var(--text-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; e.currentTarget.style.borderColor = "var(--accent-medium)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
            >
              <Plus size={11} /> Add Section
            </button>
          )}
        </div>
      )}
    </div>
  );
}
