"use client";

import { Wrench, Swords } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { Editable } from "@/components/editable-text";
import { useContentContext } from "@/components/content-provider";
import { useAuth } from "@/components/auth-provider";
import { hasAnyEditAccessInCourse } from "@/hooks/use-permissions";
import { useProgress } from "@/components/progress-provider";
import { buildCourseStructure, getEffectiveStatus } from "@/lib/courses/course-structure";
import {
  getCourseKeys,
  getCourseSlug,
  getCourseStatus,
  SEED_COURSE_IDS,
} from "@/lib/courses/course-utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COURSE_ICONS: Record<string, React.ComponentType<any>> = {
  foundations: Wrench,
  "character-modding": Swords,
};

const FALLBACK_TITLES: Record<string, string> = {
  foundations: "Foundations",
  "character-modding": "Character Modding",
};

const FALLBACK_DESCS: Record<string, string> = {
  foundations: "Getting started with modding tools, file systems, backups, and the modding ecosystem.",
  "character-modding": "Hitboxes, movesets, animations, and building custom fighters from scratch.",
};

function parseJSON<T>(str: string | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; }
  catch { return fallback; }
}

export function CurriculumPreview() {
  const { content } = useContentContext();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { completed, signedIn } = useProgress();
  const filled = theme === "light";

  const courseIds: string[] = parseJSON(content["curriculum_course_ids"], SEED_COURSE_IDS);
  const visibleIds = courseIds.filter((id) => content[`course_${id}_deleted`] !== "1");

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 flex flex-col gap-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
            Curriculum
          </span>
          <Editable
            contentKey="cp_title"
            fallback="What you'll learn"
            as="h2"
            className="text-3xl font-light text-[var(--text)]"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleIds.map((courseId) => {
            const { titleKey, descKey } = getCourseKeys(courseId);
            const Icon = COURSE_ICONS[courseId] ?? Wrench;
            const status = getCourseStatus(courseId, content);
            const slug = getCourseSlug(courseId, content);
            const isAvailable = status === "available";
            const { allLessons } = buildCourseStructure(courseId, content);
            // Access = admin, or granted this course or any lesson in it
            const canAccessCourse = !!profile?.is_admin || hasAnyEditAccessInCourse(profile?.username, content, courseId, allLessons.map((l) => l.lessonKey));
            // Draft courses are hidden from anyone without access
            if (status === "draft" && !canAccessCourse) return null;
            const canOpen = isAvailable || canAccessCourse;

            // Learner progress at a glance (signed-in, started courses only)
            const published = signedIn && isAvailable
              ? allLessons.filter(
                  (l) => getEffectiveStatus(l.lessonKey, l.hasStaticContent, content) === "published"
                )
              : [];
            const doneCount = published.filter((l) => completed.has(l.lessonKey)).length;
            const showProgress = doneCount > 0 && published.length > 0;

            const card = (
              <div
                className="p-6 rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border-color)] flex flex-col gap-4 h-full transition-all"
                style={{
                  boxShadow: theme === "light" ? "0 4px 16px rgba(45,41,38,0.08)" : "none",
                  borderColor: theme === "light" ? "transparent" : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <Icon
                    className="w-5 h-5 text-[var(--accent-medium)]"
                    strokeWidth={filled ? 0 : 1.5}
                    fill={filled ? "currentColor" : "none"}
                  />
                  {!isAvailable && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-2 py-0.5 rounded-[var(--radius-tag)] border border-[var(--border-color)]">
                      Coming Soon
                    </span>
                  )}
                </div>
                <Editable
                  contentKey={titleKey}
                  fallback={FALLBACK_TITLES[courseId] ?? "Course"}
                  as="h3"
                  className="text-lg font-light text-[var(--text)]"
                />
                <Editable
                  contentKey={descKey}
                  fallback={FALLBACK_DESCS[courseId] ?? "Description of this course."}
                  as="p"
                  className="text-sm text-[var(--text-muted)] leading-relaxed"
                />
                {showProgress && (
                  <div className="mt-auto flex items-center gap-2.5 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                    <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-color)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.round((doneCount / published.length) * 100)}%`, background: "var(--accent-medium)" }}
                      />
                    </div>
                    <span className="shrink-0">{doneCount} / {published.length}</span>
                  </div>
                )}
              </div>
            );

            return canOpen ? (
              <Link key={courseId} href={`/courses/${slug}`} className="block group">
                {card}
              </Link>
            ) : (
              <div key={courseId}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
