"use client";

import { Wrench, Box, Film, Code, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { Editable } from "@/components/editable-text";
import { useContentContext } from "@/components/content-provider";
import { useAuth } from "@/components/auth-provider";
import { usePermissions, hasAnyEditAccessInCourse } from "@/hooks/use-permissions";
import { useProgress } from "@/components/progress-provider";
import { courseIsVisible } from "@/components/course-card";
import { buildCourseStructure, getEffectiveStatus, parseJSON } from "@/lib/courses/course-structure";
import { getCourseKeys, getCourseSlug, getCourseStatus, SEED_COURSE_IDS } from "@/lib/courses/course-utils";
import {
  buildCategories, getFeaturedCourseId, categoryTitleKey, categoryDescKey,
  type LiveCategory,
} from "@/lib/courses/categories";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = React.ComponentType<any>;

const CATEGORY_ICONS: Record<string, IconType> = {
  modeling: Box,
  animation: Film,
  coding: Code,
  others: Sparkles,
};

export function CurriculumPreview() {
  const { content } = useContentContext();
  const { profile } = useAuth();
  const { isAdmin, can } = usePermissions();
  const canManageCourses = can("manage_courses");

  const courseIds: string[] = parseJSON(content["curriculum_course_ids"], SEED_COURSE_IDS);
  const liveCourseIds = courseIds.filter((id) => content[`course_${id}_deleted`] !== "1");
  const featuredId = getFeaturedCourseId(content);
  const categories = buildCategories(content, liveCourseIds);

  const visibleCount = (ids: string[]) =>
    ids.filter((id) => courseIsVisible(id, content, profile?.username, isAdmin, canManageCourses)).length;

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 flex flex-col gap-2">
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

        {/* The starting point, on its own */}
        <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--accent-medium)" }}>
          Start here
        </p>
        <FeaturedCourse courseId={featuredId} />

        {/* Then the majors */}
        <div className="flex items-center gap-3 mt-12 mb-5">
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Choose your major
          </p>
          <div className="flex-1 h-px" style={{ background: "var(--border-color)" }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <MajorCard key={cat.id} category={cat} count={visibleCount(cat.courseIds)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedCourse({ courseId }: { courseId: string }) {
  const { content } = useContentContext();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { completed, signedIn } = useProgress();
  const filled = theme === "light";

  const { titleKey, descKey } = getCourseKeys(courseId);
  const status = getCourseStatus(courseId, content);
  const slug = getCourseSlug(courseId, content);
  const isAvailable = status === "available";
  const { allLessons } = buildCourseStructure(courseId, content);

  const canAccessCourse =
    !!profile?.is_admin ||
    hasAnyEditAccessInCourse(profile?.username, content, courseId, allLessons.map((l) => l.lessonKey));
  if (status === "draft" && !canAccessCourse) return null;
  const canOpen = isAvailable || canAccessCourse;

  // Learner progress at a glance (signed-in, started courses only)
  const published = signedIn && isAvailable
    ? allLessons.filter((l) => getEffectiveStatus(l.lessonKey, l.hasStaticContent, content) === "published")
    : [];
  const doneCount = published.filter((l) => completed.has(l.lessonKey)).length;
  const showProgress = doneCount > 0 && published.length > 0;

  const card = (
    <div
      className="p-6 rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border-color)] flex flex-col gap-4 transition-all"
      style={{
        boxShadow: theme === "light" ? "0 4px 16px rgba(45,41,38,0.08)" : "none",
        borderColor: theme === "light" ? "transparent" : undefined,
      }}
    >
      <div className="flex items-center justify-between">
        <Wrench
          className="w-5 h-5 text-[var(--accent-medium)]"
          strokeWidth={filled ? 0 : 1.5}
          fill={filled ? "currentColor" : "none"}
        />
        {!isAvailable && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-2 py-0.5 rounded-[var(--radius-tag)] border border-[var(--border-color)]">
            {status === "draft" ? "Draft" : "Coming Soon"}
          </span>
        )}
      </div>
      <Editable contentKey={titleKey} fallback="Course" as="h3" className="text-lg font-light text-[var(--text)]" />
      <Editable
        contentKey={descKey}
        fallback="Description of this course."
        as="p"
        className="text-sm text-[var(--text-muted)] leading-relaxed"
      />
      {showProgress && (
        <div className="flex items-center gap-2.5 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
          <div
            className="h-1 flex-1 rounded-full overflow-hidden"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-color)" }}
          >
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
    <Link href={`/courses/${slug}`} className="block group">{card}</Link>
  ) : (
    card
  );
}

function MajorCard({ category, count }: { category: LiveCategory; count: number }) {
  const { theme } = useTheme();
  const filled = theme === "light";
  const Icon = CATEGORY_ICONS[category.id] ?? Sparkles;

  return (
    <Link href={`/curriculum/${category.id}`} className="block group h-full">
      <div
        className="p-6 rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border-color)] flex flex-col gap-4 h-full transition-all group-hover:border-[var(--accent-medium)]"
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
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-50" style={{ color: "var(--text-muted)" }}>
            {count} course{count === 1 ? "" : "s"}
          </span>
        </div>
        <Editable
          contentKey={categoryTitleKey(category.id)}
          fallback={category.title}
          as="h3"
          className="text-lg font-light text-[var(--text)]"
        />
        <Editable
          contentKey={categoryDescKey(category.id)}
          fallback="The recommended order to work through these courses."
          as="p"
          className="text-sm text-[var(--text-muted)] leading-relaxed"
        />
        <span
          className="mt-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest"
          style={{ color: "var(--accent-medium)" }}
        >
          See the path <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
