"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, GraduationCap, BookOpen, Wrench, Lock } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/auth-provider";
import { useContentContext } from "@/components/content-provider";
import { buildCourseStructure, getEffectiveStatus, parseJSON } from "@/lib/courses/course-structure";
import { getCourseKeys, getCourseSlug, SEED_COURSE_IDS, PROJECT_ICONS } from "@/lib/courses/course-utils";
import { courseAclKey, lessonAclKey } from "@/hooks/use-permissions";
import { roleColor } from "@/lib/role-color";
import type { Profile } from "@/components/auth-provider";

interface AccessLesson {
  lessonKey: string;
  title: string;
  slug: string;
  status: "published" | "soon" | "draft";
  isProject: boolean;
}
interface AccessSection {
  sectionId: string;
  sectionTitle: string;
  lessons: AccessLesson[];
}
interface AccessCourse {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  hasCourseGrant: boolean;
  lessonCount: number;
  sections: AccessSection[];
}

function aclHas(content: Record<string, string>, key: string, username: string): boolean {
  try { return (JSON.parse(content[key] ?? "[]") as string[]).includes(username); }
  catch { return false; }
}

// Courses → sections → lessons the user can edit. A whole-course grant (or admin)
// includes every lesson; otherwise only the specifically granted lessons.
export function computeAccessTree(profile: Profile | null, content: Record<string, string>): AccessCourse[] {
  const username = profile?.username;
  const isAdmin = !!profile?.is_admin;
  if (!username && !isAdmin) return [];

  const courseIds = Array.from(new Set([
    ...parseJSON<string[]>(content["curriculum_course_ids"], SEED_COURSE_IDS),
    ...SEED_COURSE_IDS,
  ])).filter((id) => content[`course_${id}_deleted`] !== "1");

  const out: AccessCourse[] = [];
  for (const courseId of courseIds) {
    const courseTitle = content[getCourseKeys(courseId).titleKey] ?? "Course";
    const courseSlug = getCourseSlug(courseId, content);
    const hasCourseGrant = isAdmin || (!!username && aclHas(content, courseAclKey(courseId), username));
    const { sections } = buildCourseStructure(courseId, content);

    const accessSections: AccessSection[] = [];
    let lessonCount = 0;
    for (const section of sections) {
      const lessons: AccessLesson[] = section.lessons
        .filter((l) => hasCourseGrant || (!!username && aclHas(content, lessonAclKey(l.lessonKey), username)))
        .map((l) => ({
          lessonKey: l.lessonKey,
          title: content[`${l.lessonKey}_title`] ?? l.titleFallback,
          slug: l.slug,
          status: getEffectiveStatus(l.lessonKey, l.hasStaticContent, content),
          isProject: PROJECT_ICONS.has(content[`${l.lessonKey}_icon`] ?? l.iconFallback),
        }));
      if (lessons.length > 0) {
        accessSections.push({ sectionId: section.sectionId, sectionTitle: content[`${section.sectionKey}_title`] ?? section.titleFallback, lessons });
        lessonCount += lessons.length;
      }
    }

    if (hasCourseGrant || accessSections.length > 0) {
      out.push({ courseId, courseTitle, courseSlug, hasCourseGrant, lessonCount, sections: accessSections });
    }
  }
  return out;
}

export default function MyAccessPage() {
  const { profile } = useAuth();
  const { content } = useContentContext();
  const tree = useMemo(() => computeAccessTree(profile, content), [profile, content]);

  const roleLabel = profile?.is_admin ? "Admin" : profile?.role ?? null;
  const roleTint = profile?.is_admin ? "#ed4245" : roleColor(profile?.role);
  const totalLessons = tree.reduce((n, c) => n + c.lessonCount, 0);

  return (
    <>
      <Nav />
      {/* Rotate the caret when a course/section is open (native details state) */}
      <style>{`
        .mya-tree .mya-chev { transition: transform 0.15s ease; }
        .mya-tree details[open] > summary .mya-chev { transform: rotate(90deg); }
      `}</style>
      <main className="pt-14 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-16">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)]">Your Edit Access</p>
              {roleLabel && (
                <span
                  className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-[var(--radius-tag)]"
                  style={{ color: roleTint, border: `1px solid ${roleTint}` }}
                >
                  {roleLabel}
                </span>
              )}
            </div>
            <h1 className="text-4xl font-extralight tracking-wide text-[var(--text)] mb-4">Your Material</h1>
            <p className="text-[var(--text-muted)] leading-relaxed text-sm">
              The courses and lessons you can edit. Click a course or section to expand it, then open a lesson to work on it.
              {tree.length > 0 && <> <span className="opacity-60">({tree.length} course{tree.length === 1 ? "" : "s"} · {totalLessons} lesson{totalLessons === 1 ? "" : "s"})</span></>}
            </p>
          </div>

          {!roleLabel ? (
            <EmptyState
              title="You don't have an editing role"
              body="Ask an admin to assign you a role and grant you access to courses or lessons."
            />
          ) : tree.length === 0 ? (
            <EmptyState
              title="No material assigned yet"
              body="You have a role but haven't been granted any courses or lessons. An admin or professor can grant you access from a course or lesson page."
            />
          ) : (
            <div className="mya-tree flex flex-col gap-3">
              {tree.map((course) => (
                <CourseBlock key={course.courseId} course={course} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="flex flex-col items-center text-center gap-2 px-6 py-14"
      style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)" }}
    >
      <Lock size={18} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
      <p className="text-sm text-[var(--text)]">{title}</p>
      <p className="text-[13px] max-w-sm" style={{ color: "var(--text-muted)", opacity: 0.7 }}>{body}</p>
    </div>
  );
}

function CourseBlock({ course }: { course: AccessCourse }) {
  return (
    <details
      open
      style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", overflow: "hidden", background: "var(--surface)" }}
    >
      <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer list-none select-none hover:bg-[var(--surface-raised)] transition-colors">
        <ChevronRight size={14} className="mya-chev shrink-0" style={{ color: "var(--text-muted)" }} />
        <GraduationCap size={15} className="shrink-0" style={{ color: "var(--accent-medium)" }} />
        {course.hasCourseGrant ? (
          <Link href={`/courses/${course.courseSlug}`} onClick={(e) => e.stopPropagation()} className="text-[15px] font-light text-[var(--text)] hover:text-[var(--accent-medium)] transition-colors capitalize truncate">
            {course.courseTitle}
          </Link>
        ) : (
          <span className="text-[15px] font-light text-[var(--text)] capitalize truncate">{course.courseTitle}</span>
        )}
        {course.hasCourseGrant && (
          <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0" style={{ color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }}>
            Full course
          </span>
        )}
        <span className="ml-auto font-mono text-[10px] shrink-0" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
          {course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"}
        </span>
      </summary>

      <div className="px-3 pb-3 flex flex-col gap-1.5" style={{ borderTop: "1px solid var(--border-color)" }}>
        {course.sections.map((section) => (
          <SectionBlock key={section.sectionId} section={section} courseSlug={course.courseSlug} />
        ))}
      </div>
    </details>
  );
}

function SectionBlock({ section, courseSlug }: { section: AccessSection; courseSlug: string }) {
  return (
    <details className="mt-2 first:mt-3">
      <summary className="flex items-center gap-2.5 px-2 py-1.5 cursor-pointer list-none select-none rounded-[var(--radius-button)] hover:bg-[var(--surface-raised)] transition-colors">
        <ChevronRight size={12} className="mya-chev shrink-0" style={{ color: "var(--text-muted)" }} />
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{section.sectionTitle}</span>
        <span className="ml-auto font-mono text-[9px] shrink-0" style={{ color: "var(--text-muted)", opacity: 0.5 }}>{section.lessons.length}</span>
      </summary>
      <div className="pl-7 pr-2 pt-1 pb-1 flex flex-col">
        {section.lessons.map((lesson) => (
          <Link
            key={lesson.lessonKey}
            href={`/courses/${courseSlug}/${lesson.slug}`}
            className="flex items-center gap-2.5 px-2 py-1.5 text-[13px] rounded-[var(--radius-button)] transition-colors hover:bg-[var(--surface-raised)]"
            style={{ color: "var(--text)" }}
          >
            {lesson.isProject
              ? <Wrench size={12} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--accent-medium)" }} />
              : <BookOpen size={12} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--text-muted)" }} />}
            <span className="flex-1 truncate capitalize">{lesson.title}</span>
            {lesson.status !== "published" && (
              <span className="font-mono text-[8px] uppercase tracking-widest shrink-0" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                {lesson.status}
              </span>
            )}
          </Link>
        ))}
      </div>
    </details>
  );
}
