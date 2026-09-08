"use client";

import Link from "next/link";
import { ArrowRight, X, AlertTriangle } from "lucide-react";
import { Editable } from "@/components/editable-text";
import { useContentContext } from "@/components/content-provider";
import { useAuth } from "@/components/auth-provider";
import { usePermissions, hasAnyEditAccessInCourse } from "@/hooks/use-permissions";
import { buildCourseStructure } from "@/lib/courses/course-structure";
import { getCourseKeys, getCourseSlug, getCourseStatus, levelColor } from "@/lib/courses/course-utils";

// Would this course render at all for the current viewer? Used to count what a
// category actually shows, so a category full of drafts doesn't advertise
// courses a visitor can't open. Deliberately a plain function rather than a
// hook: callers run it over a list, and hooks can't be called in a loop.
export function courseIsVisible(
  courseId: string,
  content: Record<string, string>,
  username: string | undefined,
  isAdmin: boolean,
  canManageCourses: boolean
): boolean {
  if (content[`course_${courseId}_deleted`] === "1" && !canManageCourses) return false;
  if (getCourseStatus(courseId, content) === "draft") {
    const lessonKeys = buildCourseStructure(courseId, content).allLessons.map((l) => l.lessonKey);
    if (!isAdmin && !hasAnyEditAccessInCourse(username, content, courseId, lessonKeys)) return false;
  }
  return true;
}

export function CourseCard({
  courseId,
  onRemove,
}: {
  courseId: string;
  onRemove?: () => void;
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

  const level = content[levelKey] ?? "Beginner";

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
              ? { color: levelColor(level), border: `1px solid ${levelColor(level)}` }
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
        {canManageCourses && onRemove && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
            title="Remove course"
            className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:brightness-110"
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

export function RemoveWarning({
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
              This will hide the course from all visitors. Lesson content is preserved. You can restore it by adding the course back.
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
