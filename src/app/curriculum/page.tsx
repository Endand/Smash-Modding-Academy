"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ArrowRight, Plus, X, AlertTriangle } from "lucide-react";
import { Editable } from "@/components/editable-text";
import { useContentContext } from "@/components/content-provider";
import { useAuth } from "@/components/auth-provider";
import { usePermissions, hasAnyEditAccessInCourse } from "@/hooks/use-permissions";
import { buildCourseStructure } from "@/lib/courses/course-structure";
import {
  getCourseKeys,
  getCourseSlug,
  getCourseStatus,
  SEED_COURSE_IDS,
} from "@/lib/courses/course-utils";

function parseJSON<T>(str: string | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; }
  catch { return fallback; }
}

const LEVEL_ORDER: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };

// ── Remove warning dialog ─────────────────────────────────────────────────────

function RemoveWarning({
  courseName,
  onConfirm,
  onCancel,
}: {
  courseName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onCancel}
    >
      <div
        className="max-w-sm w-full p-6 flex flex-col gap-4"
        style={{ background: "var(--bg)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: "var(--accent-medium)" }} />
          <div>
            <p className="text-sm text-[var(--text)] font-light leading-snug">
              Remove <strong className="font-medium">{courseName}</strong>?
            </p>
            <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              This will hide the course from all visitors. Lesson content is preserved — you can restore it by adding the course back.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)]"
            style={{ border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)]"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Course card ───────────────────────────────────────────────────────────────

function CourseCard({
  courseId,
  onRemove,
}: {
  courseId: string;
  onRemove: () => void;
}) {
  const { content } = useContentContext();
  const { profile } = useAuth();
  const { can, isAdmin } = usePermissions();
  const canManageCourses = can("manage_courses");
  // Site-scoped page can't see grants via can(); check directly. Access = admin,
  // or granted this course or any lesson in it.
  const lessonKeys = buildCourseStructure(courseId, content).allLessons.map((l) => l.lessonKey);
  const canAccessCourse = isAdmin || hasAnyEditAccessInCourse(profile?.username, content, courseId, lessonKeys);

  const { titleKey, levelKey, descKey } = getCourseKeys(courseId);
  const courseSlug = getCourseSlug(courseId, content);
  const status = getCourseStatus(courseId, content);
  const isDeleted = content[`course_${courseId}_deleted`] === "1";

  const title = content[titleKey] ?? "Course";
  const level = content[levelKey] ?? "Beginner";
  const desc  = content[descKey]  ?? "Description of this course.";

  // Only course-managers see removed courses; draft courses hide from anyone
  // without access; "soon" stays a public teaser.
  if (isDeleted && !canManageCourses) return null;
  if (status === "draft" && !canAccessCourse) return null;

  const isAvailable = status === "available";
  const href = `/courses/${courseSlug}`;

  const cardInner = (
    <div
      className={`p-6 flex items-start justify-between gap-4 transition-all ${
        isAvailable && !isDeleted ? "group-hover:border-[var(--accent-medium)]" : ""
      } ${isDeleted ? "opacity-40" : !isAvailable ? "opacity-60" : ""}`}
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)" }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <Editable contentKey={titleKey} fallback="Course Title" as="h2" className="text-lg font-extralight text-[var(--text)]" />
          <span
            className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-tag)] shrink-0"
            style={isAvailable && !isDeleted
              ? { color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }
              : { color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
          >
            {level}
          </span>
          {isDeleted && canManageCourses && (
            <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-tag)] shrink-0" style={{ color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}>
              Removed
            </span>
          )}
          {!isAvailable && !isDeleted && canAccessCourse && (
            <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-tag)] shrink-0" style={{ color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}>
              {status === "draft" ? "Draft" : "Soon"}
            </span>
          )}
        </div>
        <Editable contentKey={descKey} fallback="Description of this course." as="p" className="text-sm text-[var(--text-muted)]" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isAvailable && !isDeleted && (
          <ArrowRight size={16} strokeWidth={1.5} className="transition-opacity opacity-30 group-hover:opacity-70" style={{ color: "var(--text)" }} />
        )}
        {canManageCourses && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
            title="Remove course"
            className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:brightness-110"
            style={{ background: "#ed4245", border: "1px solid #ed4245", color: "#fff" }}
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );

  if ((isAvailable || canAccessCourse) && !isDeleted) {
    return <Link href={href} className="block group">{cardInner}</Link>;
  }
  return <div className="group">{cardInner}</div>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CurriculumPage() {
  const { content, updateContent } = useContentContext();
  const { can } = usePermissions();
  const canManageCourses = can("manage_courses");

  // Live course ID list: seed + any dynamic additions, minus deleted
  const courseIds: string[] = parseJSON(
    content["curriculum_course_ids"],
    SEED_COURSE_IDS
  );
  const visibleIds = canManageCourses
    ? courseIds
    : courseIds.filter((id) => content[`course_${id}_deleted`] !== "1");

  // Sort by difficulty level
  const sortedIds = [...visibleIds].sort((a, b) => {
    const la = LEVEL_ORDER[content[getCourseKeys(a).levelKey] ?? "Beginner"] ?? 99;
    const lb = LEVEL_ORDER[content[getCourseKeys(b).levelKey] ?? "Beginner"] ?? 99;
    return la - lb;
  });

  // Add course UI state
  const [addingCourse, setAddingCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");

  // Remove warning state
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  const handleAddCourse = () => {
    const name = newCourseName.trim() || "New Course";
    const ts = Date.now();
    const cId = `cdyn_${ts}`;
    const short = ts.toString().slice(-6);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || `course-${short}`;

    updateContent(`curriculum_course_ids`, JSON.stringify([...courseIds, cId]));
    updateContent(getCourseKeys(cId).titleKey, name);
    updateContent(getCourseKeys(cId).levelKey, "Beginner");
    updateContent(getCourseKeys(cId).descKey, "Description of this course.");
    updateContent(`course_${cId}_slug`, slug);
    updateContent(`course_${cId}_status`, "soon");

    // Add to slug map so the course page resolves
    const slugMap: Record<string, string> = parseJSON(content["curriculum_slug_map"], {});
    updateContent("curriculum_slug_map", JSON.stringify({ ...slugMap, [slug]: cId }));

    setNewCourseName("");
    setAddingCourse(false);
  };

  const handleRemoveConfirm = () => {
    if (!pendingRemove) return;
    updateContent(`course_${pendingRemove}_deleted`, "1");
    setPendingRemove(null);
  };

  const pendingCourseName = pendingRemove
    ? (content[getCourseKeys(pendingRemove).titleKey] ?? "this course")
    : "";

  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="mb-12">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Paths</p>
            <h1 className="text-4xl font-extralight tracking-wide text-[var(--text)] mb-4">Curriculum</h1>
            <Editable
              contentKey="curriculum_subtitle"
              fallback="A structured path through Smash Ultimate modding — from your first texture swap to publishing finished mods."
              as="p"
              className="text-[var(--text-muted)] leading-relaxed"
            />
          </div>

          <div className="flex flex-col gap-3">
            {sortedIds.map((courseId) => (
              <CourseCard
                key={courseId}
                courseId={courseId}
                onRemove={() => setPendingRemove(courseId)}
              />
            ))}

            {/* Add Course button — requires manage_courses */}
            {canManageCourses && (
              addingCourse ? (
                <div
                  className="p-5 flex items-center gap-2"
                  style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)" }}
                >
                  <input
                    autoFocus
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCourse();
                      if (e.key === "Escape") { setAddingCourse(false); setNewCourseName(""); }
                    }}
                    placeholder="Course name"
                    className="flex-1 px-3 py-2 text-sm font-mono bg-transparent outline-none"
                    style={{ border: "1px solid var(--border-strong)", borderRadius: "var(--radius-button)", color: "var(--text)" }}
                  />
                  <button
                    onClick={handleAddCourse}
                    className="px-4 py-2 text-[11px] font-mono uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)]"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setAddingCourse(false); setNewCourseName(""); }}
                    className="px-3 py-2 text-[11px] font-mono uppercase tracking-widest cursor-pointer"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCourse(true)}
                  className="flex items-center justify-center gap-2 px-4 py-4 font-mono text-[10px] uppercase tracking-widest cursor-pointer transition-colors"
                  style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)", color: "var(--text-muted)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; e.currentTarget.style.borderColor = "var(--accent-medium)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
                >
                  <Plus size={11} /> Add Course
                </button>
              )
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Remove confirmation dialog */}
      {pendingRemove && (
        <RemoveWarning
          courseName={pendingCourseName}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setPendingRemove(null)}
        />
      )}
    </>
  );
}
