"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X, ChevronDown, ChevronUp, Check } from "lucide-react";
import { useProgress } from "@/components/progress-provider";
import { Editable } from "@/components/editable-text";
import { EditableIcon } from "@/components/editable-icon";
import { useContentContext } from "@/components/content-provider";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useCourseStructure,
  getEffectiveStatus,
  getSectionIdList,
  getLessonIdList,
  moveVisible,
  parseJSON,
  type LiveLesson,
  type LiveSection,
} from "@/hooks/use-course-structure";
import { getCourseKeys, getCourseSlug, getCourseStatus, slugFromTitle, PROJECT_ICONS } from "@/lib/courses/course-utils";

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const STATUSES = [
  { value: "published", label: "Published", color: "var(--accent-medium)" },
  { value: "soon",      label: "Soon",      color: "var(--text-muted)" },
  { value: "draft",     label: "Draft",     color: "var(--text-muted)" },
] as const;

// ── Level badge / dropdown ────────────────────────────────────────────────────

function LevelBadge({ courseId }: { courseId: string }) {
  const { content, updateContent } = useContentContext();
  const { can } = usePermissions();
  const { levelKey } = getCourseKeys(courseId);
  const level = content[levelKey] ?? "Beginner";

  if (!can("manage_lessons")) {
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
  const { can } = usePermissions();
  const status = getEffectiveStatus(lessonKey, hasStaticContent, content);

  if (!can("manage_lessons")) {
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
  lesson, courseSlug, isLast, onRemove, onMove, canMoveUp, canMoveDown,
}: {
  lesson: LiveLesson;
  courseSlug: string;
  isLast: boolean;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const { content } = useContentContext();
  const { can } = usePermissions();
  const canManage = can("manage_sections");
  const canPublish = can("manage_lessons");
  const { completed } = useProgress();
  const iconName = content[`${lesson.lessonKey}_icon`] ?? lesson.iconFallback;
  const isProject = PROJECT_ICONS.has(iconName);
  const status = getEffectiveStatus(lesson.lessonKey, lesson.hasStaticContent, content);
  const isAccessible = status === "published" || canPublish;
  const isComplete = completed.has(lesson.lessonKey);

  if (status === "draft" && !canPublish) return null;

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
        style={{ color: "var(--text)" }}
      />
      {isProject && (
        <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-tag)] hidden sm:inline" style={{ color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }}>
          Project
        </span>
      )}
      {isComplete && (
        <Check size={14} strokeWidth={2} className="shrink-0" style={{ color: "var(--accent-medium)" }} aria-label="Completed" />
      )}
      <StatusControl lessonKey={lesson.lessonKey} hasStaticContent={lesson.hasStaticContent} />
      {canManage && (
        <span className="flex items-center gap-0.5 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMove(-1); }}
            disabled={!canMoveUp}
            title="Move up"
            className="w-4 h-4 rounded flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-default"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
          >
            <ChevronUp size={9} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMove(1); }}
            disabled={!canMoveDown}
            title="Move down"
            className="w-4 h-4 rounded flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-default"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
          >
            <ChevronDown size={9} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
            title="Remove lesson"
            className="w-4 h-4 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
          >
            <X size={9} />
          </button>
        </span>
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

  const handleAdd = (kind: "lesson" | "project") => {
    const ts = Date.now();
    const lId = `ldyn_${ts}`;
    const lk = `${courseId}_${lId}`;
    const short = ts.toString().slice(-6);
    const slug = kind === "project" ? `new-project-${short}` : `new-lesson-${short}`;

    const currentIds: string[] = parseJSON(
      content[`${section.sectionKey}_lesson_ids`],
      section.lessons.map((l) => l.lessonKey.replace(`${courseId}_`, ""))
    );
    updateContent(`${section.sectionKey}_lesson_ids`, JSON.stringify([...currentIds, lId]));
    updateContent(`${lk}_title`, kind === "project" ? "New Project" : "New Lesson");
    updateContent(`${lk}_status`, "draft");
    updateContent(`${lk}_icon`, kind === "project" ? "Wrench" : "BookOpen");
    updateContent(`${lk}_slug`, slug);

    const slugMap: Record<string, string> = parseJSON(content[`${courseId}_slug_map`], {});
    updateContent(`${courseId}_slug_map`, JSON.stringify({ ...slugMap, [slug]: lk }));

    if (kind === "project") {
      // Project template (Odin Project style): overview body + step-by-step assignment
      updateContent(`${lk}_intro`, "Time to put what you've learned into practice. In this project, you'll build something real from scratch.");
      updateContent(`${lk}_section_count`, "1");
      updateContent(`${lk}_s0_heading`, "Overview");
      updateContent(`${lk}_s0_p0`, "Describe the project here — what the student will build, what the finished result should look like, and which earlier lessons it draws on.");
      updateContent(`${lk}_s0_para_count`, "1");
      updateContent(`${lk}_assign_desc`, "Complete the following steps. Don't worry about making it perfect — finishing is what counts.");
      updateContent(`${lk}_assign_count`, "3");
      updateContent(`${lk}_assign_0`, "Set up: get the files and tools from the lessons ready.");
      updateContent(`${lk}_assign_1`, "Build: work through the main task described in the overview.");
      updateContent(`${lk}_assign_2`, "Share: post your finished result in the SMA Discord for feedback.");
    }
  };

  const btnClass = "flex-1 flex items-center justify-center gap-1.5 px-4 py-2 font-mono text-[10px] uppercase tracking-widest cursor-pointer transition-colors";

  return (
    <div className="flex" style={{ borderTop: "1px dashed var(--border-strong)" }}>
      <button
        onClick={() => handleAdd("lesson")}
        className={btnClass}
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
      >
        <Plus size={10} /> Add Lesson
      </button>
      <div className="w-px self-stretch" style={{ background: "var(--border-color)" }} />
      <button
        onClick={() => handleAdd("project")}
        className={btnClass}
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
      >
        <Plus size={10} /> Add Project
      </button>
    </div>
  );
}

// ── Slug row (admin only) ─────────────────────────────────────────────────────

function SlugRow({ courseId, courseSlug }: { courseId: string; courseSlug: string }) {
  const { content, updateContent } = useContentContext();
  const { titleKey } = getCourseKeys(courseId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(courseSlug);

  const applySlug = (slug: string) => {
    const clean = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || courseSlug;
    updateContent(`course_${courseId}_slug`, clean);
    // Add new slug → courseId to curriculum_slug_map so the dynamic route resolves it
    const existing: Record<string, string> = (() => {
      try { return JSON.parse(content["curriculum_slug_map"] ?? "{}"); } catch { return {}; }
    })();
    updateContent("curriculum_slug_map", JSON.stringify({ ...existing, [clean]: courseId }));
    setEditing(false);
  };

  const syncFromTitle = () => {
    const title = content[titleKey] ?? "course";
    applySlug(slugFromTitle(title));
  };

  return (
    <div className="mt-3 flex items-center gap-2 font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
      <span className="opacity-50">URL:</span>
      {editing ? (
        <>
          <span className="opacity-40">/courses/</span>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applySlug(draft); if (e.key === "Escape") setEditing(false); }}
            className="px-2 py-0.5 bg-transparent outline-none border-b w-40"
            style={{ borderColor: "var(--accent-medium)", color: "var(--text)" }}
          />
          <button onClick={() => applySlug(draft)} className="px-2 py-0.5 cursor-pointer" style={{ color: "var(--accent-medium)" }}>Save</button>
          <button onClick={() => setEditing(false)} className="px-2 py-0.5 cursor-pointer opacity-50">Cancel</button>
        </>
      ) : (
        <>
          <span>/courses/<span style={{ color: "var(--text)" }}>{courseSlug}</span></span>
          <button onClick={() => { setDraft(courseSlug); setEditing(true); }} className="px-2 py-0.5 cursor-pointer hover:opacity-100 opacity-40 transition-opacity">Edit</button>
          <button onClick={syncFromTitle} className="px-2 py-0.5 cursor-pointer hover:opacity-100 opacity-40 transition-opacity">Sync from title</button>
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CourseOverview({ courseId }: { courseId: string }) {
  const { content, updateContent } = useContentContext();
  const { can, isAdmin } = usePermissions();
  const canManage = can("manage_sections");
  const canPublish = can("manage_lessons");
  const { sections, allLessons } = useCourseStructure(courseId);
  const { completed, signedIn } = useProgress();
  const { titleKey, descKey } = getCourseKeys(courseId);
  const courseSlug = getCourseSlug(courseId, content);
  const courseStatus = getCourseStatus(courseId, content);

  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  // Drafts are hidden from non-editors, so leave them out of their counts too
  const countableLessons = allLessons.filter(
    (l) => canPublish || getEffectiveStatus(l.lessonKey, l.hasStaticContent, content) !== "draft"
  );
  const lessonCount = countableLessons.filter((l) => !PROJECT_ICONS.has(content[`${l.lessonKey}_icon`] ?? l.iconFallback)).length;
  const projectCount = countableLessons.length - lessonCount;

  // Learner progress over published lessons
  const publishedLessons = allLessons.filter(
    (l) => getEffectiveStatus(l.lessonKey, l.hasStaticContent, content) === "published"
  );
  const completedCount = publishedLessons.filter((l) => completed.has(l.lessonKey)).length;
  const progressPct = publishedLessons.length ? Math.round((completedCount / publishedLessons.length) * 100) : 0;

  const moveSection = (sId: string, dir: -1 | 1) => {
    const ids = getSectionIdList(courseId, content);
    const next = moveVisible(ids, sId, dir, (x) => content[`${courseId}_${x}_deleted`] !== "1");
    if (next) updateContent(`${courseId}_section_ids`, JSON.stringify(next));
  };

  const moveLesson = (section: LiveSection, lId: string, dir: -1 | 1) => {
    const ids = getLessonIdList(courseId, section.sectionId, content);
    const next = moveVisible(ids, lId, dir, (x) => content[`${courseId}_${x}_deleted`] !== "1");
    if (next) updateContent(`${section.sectionKey}_lesson_ids`, JSON.stringify(next));
  };

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

  // Non-editors see "Coming Soon" for unavailable or removed courses
  const isDeleted = content[`course_${courseId}_deleted`] === "1";
  if ((courseStatus !== "available" || isDeleted) && !canPublish) {
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
          {canPublish && (
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
                <option value="available">Published</option>
                <option value="soon">Soon</option>
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
        {isAdmin && (
          <SlugRow courseId={courseId} courseSlug={courseSlug} />
        )}
        <div className="mt-5 font-mono text-[11px] flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
          <span>{lessonCount} lessons</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{projectCount} projects</span>
        </div>
        {signedIn && publishedLessons.length > 0 && (
          <div className="mt-4 max-w-xs">
            <div className="flex items-center justify-between mb-1.5 font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              <span>Progress</span>
              <span>{completedCount} / {publishedLessons.length}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-color)" }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, background: "var(--accent-medium)" }} />
            </div>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-10">
        {sections.map((section, si) => (
          <div key={section.sectionKey} className="group/section">
            <div className="flex items-center gap-4 mb-3">
              <Editable
                as="span"
                contentKey={`${section.sectionKey}_title`}
                fallback={section.titleFallback}
                className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] whitespace-nowrap"
              />
              <div className="h-px flex-1 bg-[var(--border-color)]" />
              {canManage && (
                <span className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/section:opacity-60 hover:!opacity-100 transition-opacity">
                  <button
                    onClick={() => moveSection(section.sectionId, -1)}
                    disabled={si === 0}
                    title="Move section up"
                    className="w-4 h-4 rounded flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-default"
                    style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
                  >
                    <ChevronUp size={9} />
                  </button>
                  <button
                    onClick={() => moveSection(section.sectionId, 1)}
                    disabled={si === sections.length - 1}
                    title="Move section down"
                    className="w-4 h-4 rounded flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-default"
                    style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
                  >
                    <ChevronDown size={9} />
                  </button>
                  <button
                    onClick={() => removeSection(section)}
                    title="Remove section"
                    className="w-4 h-4 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
                  >
                    <X size={9} />
                  </button>
                </span>
              )}
            </div>
            <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
              {section.lessons.map((lesson, i) => (
                <LessonRow
                  key={lesson.lessonKey}
                  lesson={lesson}
                  courseSlug={courseSlug}
                  isLast={i === section.lessons.length - 1 && !canManage}
                  onRemove={() => removeLesson(lesson)}
                  onMove={(dir) => moveLesson(section, lesson.lessonKey.slice(courseId.length + 1), dir)}
                  canMoveUp={i > 0}
                  canMoveDown={i < section.lessons.length - 1}
                />
              ))}
              {canManage && <AddLessonBtn courseId={courseId} section={section} />}
            </div>
          </div>
        ))}
      </div>

      {/* Add Section */}
      {canManage && (
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
