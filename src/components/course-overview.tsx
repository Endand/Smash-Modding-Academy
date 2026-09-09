"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Plus, ChevronDown, ChevronUp, Check } from "lucide-react";
import { useProgress } from "@/components/progress-provider";
import { Editable } from "@/components/editable-text";
import { EditableIcon } from "@/components/editable-icon";
import { useContentContext } from "@/components/content-provider";
import { useAuth } from "@/components/auth-provider";
import { EditAccessManager, RemoveBtn, MyPendingNotice } from "@/components/lesson-content";
import { PendingChanges } from "@/components/pending-changes";
import { newCourseId, buildCategories, categoryOfCourse, getFeaturedCourseId } from "@/lib/courses/categories";
import { planLessonMove } from "@/lib/courses/move-lesson";
import { SEED_COURSE_IDS } from "@/lib/courses/course-utils";
import { PreviewLinkBtn } from "@/components/preview-link-btn";
import { hasPreviewGrant, coursePreviewKey, withPreview } from "@/lib/preview-token";
import { usePermissions, EditScopeProvider, canSeeDrafts, hasAnyEditAccessInCourse, courseAclKey, evalPermission, canApproveEdits } from "@/hooks/use-permissions";
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
import { getCourseKeys, getCourseSlug, getCourseStatus, slugFromTitle, levelColor, PROJECT_ICONS } from "@/lib/courses/course-utils";
import { replaceSlugMapEntry } from "@/lib/courses/slug-sync";

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
  const color = levelColor(level);

  if (!can("manage_lessons")) {
    return (
      <span
        className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-tag)]"
        style={{ color, border: `1px solid ${color}` }}
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
        style={{ color, border: `1px solid ${color}` }}
      >
        {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <ChevronDown size={9} className="absolute right-1.5 pointer-events-none" style={{ color }} />
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
        // preventDefault too — this sits inside the lesson row's <Link>, and
        // stopPropagation alone still lets the browser follow the anchor.
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        className="appearance-none font-mono text-[10px] uppercase tracking-widest pr-4 pl-1 py-0.5 rounded cursor-pointer bg-transparent outline-none"
        style={{ color: current.color, border: `1px solid ${current.color}`, opacity: 0.85 }}
      >
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <ChevronDown size={9} className="absolute right-0.5 pointer-events-none" style={{ color: current.color }} />
    </div>
  );
}

// ── Move-to-section dropdown ──────────────────────────────────────────────────
// Reassigns a lesson to another section. The lesson key never changes, so its
// content, slug, authors and learner progress all travel with it.

function SectionPicker({
  sections, sectionId, onMoveToSection,
}: {
  sections: LiveSection[];
  sectionId: string;
  onMoveToSection: (toSectionId: string) => void;
}) {
  const { content } = useContentContext();
  if (sections.length < 2) return null;

  return (
    <div className="relative inline-flex items-center">
      <select
        value={sectionId}
        onChange={(e) => { if (e.target.value !== sectionId) onMoveToSection(e.target.value); }}
        // preventDefault too — inside the lesson row's <Link>, stopPropagation
        // alone still lets the browser follow the anchor.
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        title="Move this lesson to another section"
        className="appearance-none font-mono text-[9px] uppercase tracking-widest pr-4 pl-1.5 py-0.5 rounded cursor-pointer bg-transparent outline-none max-w-[110px] truncate"
        style={{ color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
      >
        {sections.map((s) => (
          <option key={s.sectionId} value={s.sectionId}>
            {content[`${s.sectionKey}_title`] ?? s.titleFallback}
          </option>
        ))}
      </select>
      <ChevronDown size={9} className="absolute right-0.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
    </div>
  );
}

// ── Move-to-course dropdown ───────────────────────────────────────────────────
// Only offers courses in the same curriculum category, so a coding lesson can
// move between the coding courses but never into Animation. Unlike a section
// move this re-keys the lesson, so it asks before doing it.

export interface MoveTarget {
  courseId: string;
  title: string;
}

function CoursePicker({
  courseId,
  targets,
  lessonTitle,
  onMoveToCourse,
}: {
  courseId: string;
  targets: MoveTarget[];
  lessonTitle: string;
  onMoveToCourse: (toCourseId: string) => void;
}) {
  const [pending, setPending] = useState<MoveTarget | null>(null);
  if (targets.length === 0) return null;

  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  if (pending) {
    return (
      <span className="flex items-center gap-1.5" onClick={stop}>
        <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Move to {pending.title}?
        </span>
        <button
          onClick={(e) => { stop(e); const t = pending; setPending(null); onMoveToCourse(t.courseId); }}
          title={`Move "${lessonTitle}" to ${pending.title}`}
          className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded cursor-pointer"
          style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
        >
          Move
        </button>
        <button
          onClick={(e) => { stop(e); setPending(null); }}
          className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded cursor-pointer"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={courseId}
        onChange={(e) => {
          const t = targets.find((x) => x.courseId === e.target.value);
          if (t) setPending(t);
          e.target.value = courseId;
        }}
        // preventDefault too — inside the lesson row's <Link>, stopPropagation
        // alone still lets the browser follow the anchor.
        onClick={stop}
        title="Move this lesson to another course in the same category"
        className="appearance-none font-mono text-[9px] uppercase tracking-widest pr-4 pl-1.5 py-0.5 rounded cursor-pointer bg-transparent outline-none max-w-[110px] truncate"
        style={{ color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
      >
        <option value={courseId}>This course</option>
        {targets.map((t) => (
          <option key={t.courseId} value={t.courseId}>{t.title}</option>
        ))}
      </select>
      <ChevronDown size={9} className="absolute right-0.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
    </div>
  );
}

// ── Lesson row ────────────────────────────────────────────────────────────────

function LessonRow({
  lesson, courseId, courseSlug, isLast, onRemove, onMove, canMoveUp, canMoveDown,
  sections, sectionId, onMoveToSection, moveTargets, onMoveToCourse,
}: {
  lesson: LiveLesson;
  courseId: string;
  courseSlug: string;
  isLast: boolean;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  sections: LiveSection[];
  sectionId: string;
  onMoveToSection: (toSectionId: string) => void;
  moveTargets: MoveTarget[];
  onMoveToCourse: (toCourseId: string) => void;
}) {
  const { content } = useContentContext();
  const { profile } = useAuth();
  const { can, previewToken } = usePermissions();
  const canCurriculum = can("manage_curriculum");
  const canPublish = can("manage_lessons");
  // Assistants/professors can reach a granted lesson even in draft/soon;
  // editors (edit-only, no view_drafts) cannot. A secret link also opens it.
  const canSeeUnpublished =
    canSeeDrafts(profile, content, { type: "lesson", courseId, lessonKey: lesson.lessonKey }) ||
    hasPreviewGrant(previewToken, content, courseId, lesson.lessonKey);
  const { completed } = useProgress();
  const iconName = content[`${lesson.lessonKey}_icon`] ?? lesson.iconFallback;
  const isProject = PROJECT_ICONS.has(iconName);
  const status = getEffectiveStatus(lesson.lessonKey, lesson.hasStaticContent, content);
  const isAccessible = status === "published" || canSeeUnpublished;
  const isComplete = completed.has(lesson.lessonKey);

  if (status === "draft" && !canSeeUnpublished) return null;

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
        className="flex-1 text-sm capitalize"
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
      {canCurriculum && (
        <span className="flex items-center gap-0.5 shrink-0 ml-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <SectionPicker sections={sections} sectionId={sectionId} onMoveToSection={onMoveToSection} />
          <CoursePicker
            courseId={courseId}
            targets={moveTargets}
            lessonTitle={content[`${lesson.lessonKey}_title`] ?? lesson.titleFallback}
            onMoveToCourse={onMoveToCourse}
          />
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
          <RemoveBtn onClick={onRemove} title="Remove lesson" size="w-4 h-4" vis="" />
        </span>
      )}
    </div>
  );

  return isAccessible ? (
    <Link href={withPreview(`/courses/${courseSlug}/${lesson.slug}`, previewToken)} className="block">{inner}</Link>
  ) : inner;
}

// ── Add lesson button ─────────────────────────────────────────────────────────

function AddLessonBtn({ courseId, section }: { courseId: string; section: LiveSection }) {
  const { content, updateMany } = useContentContext();

  const handleAdd = (kind: "lesson" | "project") => {
    const { courseId: dynId, slugSuffix } = newCourseId();
    const lId = dynId.replace("cdyn_", "ldyn_");
    const lk = `${courseId}_${lId}`;
    const slug = kind === "project" ? `new-project-${slugSuffix}` : `new-lesson-${slugSuffix}`;

    const currentIds: string[] = parseJSON(
      content[`${section.sectionKey}_lesson_ids`],
      section.lessons.map((l) => l.lessonKey.replace(`${courseId}_`, ""))
    );
    const slugMap: Record<string, string> = parseJSON(content[`${courseId}_slug_map`], {});

    // One request rather than five (or thirteen for a project): a lesson that
    // only half exists is worse than one that failed to be created at all.
    const writes: [string, string][] = [
      [`${section.sectionKey}_lesson_ids`, JSON.stringify([...currentIds, lId])],
      [`${lk}_title`, kind === "project" ? "New Project" : "New Lesson"],
      [`${lk}_status`, "draft"],
      [`${lk}_icon`, kind === "project" ? "Wrench" : "BookOpen"],
      [`${lk}_slug`, slug],
      [`${courseId}_slug_map`, JSON.stringify({ ...slugMap, [slug]: lk })],
    ];

    if (kind === "project") {
      // Project template (Odin Project style): overview body + step-by-step assignment
      writes.push(
        [`${lk}_intro`, "Time to put what you've learned into practice. In this project, you'll build something real from scratch."],
        [`${lk}_section_count`, "1"],
        [`${lk}_s0_heading`, "Overview"],
        [`${lk}_s0_p0`, "Describe the project here: what the student will build, what the finished result should look like, and which earlier lessons it draws on."],
        [`${lk}_s0_para_count`, "1"],
        [`${lk}_assign_desc`, "Complete the following steps. Don't worry about making it perfect, finishing is what counts."],
        [`${lk}_assign_count`, "3"],
        [`${lk}_assign_0`, "Set up: get the files and tools from the lessons ready."],
        [`${lk}_assign_1`, "Build: work through the main task described in the overview."],
        [`${lk}_assign_2`, "Share: post your finished result in the SMA Discord for feedback."],
      );
    }

    updateMany(writes);
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
    // Replace this course's entry in the map — old URLs stop resolving
    updateContent("curriculum_slug_map", replaceSlugMapEntry(content["curriculum_slug_map"], clean, courseId));
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
  const { content, updateContent, updateMany } = useContentContext();
  // Permissions scoped to THIS course — a role-holder can act only if an admin
  // granted them this course.
  const { can, isAdmin, previewGrant, previewToken } = usePermissions({ type: "course", courseId });
  const { profile } = useAuth();
  const canEdit = can("edit_content");
  const canCurriculum = can("manage_curriculum");
  const canPublish = can("manage_lessons");
  const canEditUrls = can("edit_urls");
  const { sections, allLessons } = useCourseStructure(courseId);
  // Can this user reach this course at all? Admins; anyone granted the course or
  // any lesson in it. Lets a lesson-granted editor open a draft/soon course.
  // A course-wide secret link also opens it, for people with no account.
  const canAccessCourse = isAdmin || previewGrant || hasAnyEditAccessInCourse(profile?.username, content, courseId, allLessons.map((l) => l.lessonKey));
  const { completed, signedIn } = useProgress();
  const { titleKey, descKey } = getCourseKeys(courseId);
  const courseSlug = getCourseSlug(courseId, content);
  const courseStatus = getCourseStatus(courseId, content);

  // Follow course slug renames: old URLs die on rename, so when the slug
  // changes while this page is open, swap the address to the live URL.
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length !== 2 || parts[0] !== "courses") return;
    if (parts[1] === courseSlug) return;
    // small delay so the slug/map upserts land before the server resolves it
    const t = setTimeout(() => router.replace(withPreview(`/courses/${courseSlug}`, previewToken)), 1200);
    return () => clearTimeout(t);
  }, [pathname, courseSlug, router, previewToken]);

  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  // Confirmation that a cross-course move landed. The lesson vanishes from this
  // page when it moves, so without this it just disappears.
  const [moveNotice, setMoveNotice] = useState<{ text: string; path: string | null } | null>(null);

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
  // First published lesson not yet completed — target of "continue where you left off"
  const nextLesson = publishedLessons.find((l) => !completed.has(l.lessonKey));

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

  // Reassign a lesson to another section: pull its id out of the source list and
  // append it to the target's. The lesson key is section-independent, so the
  // lesson's content, slug, authors and learner progress are untouched.
  const moveLessonToSection = (from: LiveSection, lId: string, toSectionId: string) => {
    if (toSectionId === from.sectionId) return;
    const target = sections.find((s) => s.sectionId === toSectionId);
    if (!target) return;

    const fromIds = getLessonIdList(courseId, from.sectionId, content).filter((x) => x !== lId);
    const existingTo = getLessonIdList(courseId, toSectionId, content);
    const toIds = existingTo.includes(lId) ? existingTo : [...existingTo, lId];

    // Add to the target before removing from the source. These are two separate
    // writes, so if the second fails the lesson shows up twice — visible and
    // fixable — rather than dropping out of the course entirely.
    updateContent(`${target.sectionKey}_lesson_ids`, JSON.stringify(toIds));
    updateContent(`${from.sectionKey}_lesson_ids`, JSON.stringify(fromIds));
  };

  // Courses a lesson here may be moved to: the other live courses in this
  // course's curriculum category, minus any the user cannot manage. A course
  // in no category (the featured one) has no siblings, so its lessons stay put.
  const moveTargets: MoveTarget[] = (() => {
    // Restricted to people who publish directly. A move is one indivisible set
    // of ~30 writes; sent through the approval queue they would arrive as
    // separate proposals that a reviewer could approve piecemeal, leaving the
    // lesson in both courses or in neither.
    if (!canCurriculum || !canApproveEdits(profile, content, { type: "course", courseId })) return [];
    const allCourseIds: string[] = parseJSON(content["curriculum_course_ids"], SEED_COURSE_IDS);
    const live = allCourseIds.filter((id) => content[`course_${id}_deleted`] !== "1");
    if (courseId === getFeaturedCourseId(content)) return [];

    const categories = buildCategories(content, live);
    const myCategory = categoryOfCourse(categories, courseId);
    if (!myCategory) return [];

    return (categories.find((c) => c.id === myCategory)?.courseIds ?? [])
      .filter((id) => id !== courseId)
      .filter((id) => evalPermission(profile, content, { type: "course", courseId: id }, "manage_curriculum"))
      .map((id) => ({ courseId: id, title: content[getCourseKeys(id).titleKey] ?? "Untitled course" }));
  })();

  // Re-keys the lesson under the destination course and hands over its slug,
  // in one write. See lib/courses/move-lesson for why a key change is needed.
  const moveLessonToCourse = (from: LiveSection, lId: string, toCourseId: string) => {
    const { courseId: dynId } = newCourseId();
    const plan = planLessonMove({
      content,
      fromCourseId: courseId,
      fromSectionId: from.sectionId,
      lessonId: lId,
      toCourseId,
      newId: dynId.replace("cdyn_", "ldyn_"),
      newSectionId: dynId.replace("cdyn_", "sdyn_"),
    });
    if (!plan) return;
    updateMany(plan.writes);
    setMoveNotice({
      text: `Moved to ${content[getCourseKeys(toCourseId).titleKey] ?? "the other course"}.`,
      path: plan.newPath,
    });
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

  // Non-editors see "Coming Soon"; granted editors/professors bypass it
  const isDeleted = content[`course_${courseId}_deleted`] === "1";
  if ((courseStatus !== "available" || isDeleted) && !canAccessCourse) {
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
    <EditScopeProvider scope={{ type: "course", courseId }}>
    <div className="max-w-3xl mx-auto px-6 py-16">

      {/* Approval queue: reviewers see pending edits across this course */}
      <PendingChanges scope={{ type: "course", courseId }} />
      <MyPendingNotice prefix={courseId} />

      {moveNotice && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 mb-6 px-4 py-3"
          style={{ border: "1px solid var(--accent-medium)", borderRadius: "var(--radius-card)", background: "var(--surface)" }}
        >
          <span className="text-[13px]" style={{ color: "var(--text)" }}>{moveNotice.text}</span>
          <span className="shrink-0 flex items-center gap-2">
            {moveNotice.path && (
              <Link
                href={withPreview(moveNotice.path, previewToken)}
                className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-[var(--radius-button)]"
                style={{ color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }}
              >
                Open it
              </Link>
            )}
            <button
              onClick={() => setMoveNotice(null)}
              className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-[var(--radius-button)] cursor-pointer"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
            >
              Dismiss
            </button>
          </span>
        </div>
      )}

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
                <option value="draft">Draft</option>
              </select>
              <ChevronDown size={8} className="absolute right-1 pointer-events-none" style={{ color: courseStatus === "available" ? "var(--accent-medium)" : "var(--text-muted)" }} />
            </div>
          )}
          {(canEdit || canCurriculum || canPublish) && (
            <div className="ml-auto">
              <PreviewLinkBtn
                tokenKey={coursePreviewKey(courseId)}
                path={`/courses/${courseSlug}`}
                what="course"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mb-5">
          <Editable contentKey={titleKey} fallback="Course Title" as="h1" className="text-4xl font-extralight tracking-wide text-[var(--text)]" />
          <LevelBadge courseId={courseId} />
        </div>
        <Editable contentKey={descKey} fallback="Description of this course." as="p" className="text-[var(--text-muted)] leading-relaxed" />
        {canEditUrls && (
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
        {signedIn && nextLesson && (
          <div className="mt-5">
            <Link
              href={`/courses/${courseSlug}/${nextLesson.slug}`}
              className="inline-flex items-center gap-2 px-5 py-2 font-mono text-[11px] uppercase tracking-widest rounded-[var(--radius-button)] transition-opacity hover:opacity-85"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {completedCount === 0 ? "Start Course" : "Continue Where You Left Off"}
              <span aria-hidden>→</span>
            </Link>
            {completedCount > 0 && (
              <p className="mt-1.5 font-mono text-[10px]" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                Next: {content[`${nextLesson.lessonKey}_title`] ?? nextLesson.titleFallback}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Edit access — admin grants the whole course (and all its lessons) */}
      <EditAccessManager
        aclKey={courseAclKey(courseId)}
        title="Edit access: whole course"
        hint="Professors listed here can edit this course and every lesson inside it. For a single lesson, grant access from that lesson's page instead."
      />

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
              {canCurriculum && (
                <span className="flex items-center gap-0.5 shrink-0 opacity-100 md:opacity-0 md:group-hover/section:opacity-60 md:hover:!opacity-100 transition-opacity">
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
                  <RemoveBtn onClick={() => removeSection(section)} title="Remove section" size="w-4 h-4" vis="" />
                </span>
              )}
            </div>
            <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
              {section.lessons.map((lesson, i) => (
                <LessonRow
                  key={lesson.lessonKey}
                  lesson={lesson}
                  courseId={courseId}
                  courseSlug={courseSlug}
                  isLast={i === section.lessons.length - 1 && !canCurriculum}
                  onRemove={() => removeLesson(lesson)}
                  onMove={(dir) => moveLesson(section, lesson.lessonKey.slice(courseId.length + 1), dir)}
                  canMoveUp={i > 0}
                  canMoveDown={i < section.lessons.length - 1}
                  sections={sections}
                  sectionId={section.sectionId}
                  onMoveToSection={(to) => moveLessonToSection(section, lesson.lessonKey.slice(courseId.length + 1), to)}
                  moveTargets={moveTargets}
                  onMoveToCourse={(to) => moveLessonToCourse(section, lesson.lessonKey.slice(courseId.length + 1), to)}
                />
              ))}
              {canCurriculum && <AddLessonBtn courseId={courseId} section={section} />}
            </div>
          </div>
        ))}
      </div>

      {/* Add Section */}
      {canCurriculum && (
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
    </EditScopeProvider>
  );
}
