// Curriculum categories: the branches of the curriculum below the featured
// course. Each holds an ordered list of courses, which is the recommended path
// through that branch.
//
// Everything lives in site_content so an admin can rename a category or
// reorder its courses at any time. The seeds below are only defaults, used
// until the matching key exists.

import { parseJSON } from "@/lib/courses/course-structure";

export interface SeedCategory {
  id: string;
  title: string;
  courseIds: string[];
}

// A category's id is also its URL segment, and it never changes. Renaming the
// title is a display change only, so admins can rename freely without breaking
// links people have already shared.
export const SEED_CATEGORIES: SeedCategory[] = [
  { id: "modeling",  title: "Modeling",  courseIds: [] },
  { id: "animation", title: "Animation", courseIds: [] },
  { id: "coding",    title: "Coding",    courseIds: ["character-modding", "cdyn_1783634904086", "cdyn_1783635268668"] },
  { id: "others",    title: "Others",    courseIds: [] },
];

// Courses that belong to no category collect here rather than disappearing.
export const FALLBACK_CATEGORY_ID = "others";

// The course shown on its own above the categories: the starting point.
export function getFeaturedCourseId(content: Record<string, string>): string {
  return content["curriculum_featured_id"] ?? "foundations";
}

export function categoryTitleKey(id: string): string { return `category_${id}_title`; }
export function categoryDescKey(id: string): string { return `category_${id}_desc`; }
export function categoryCoursesKey(id: string): string { return `category_${id}_course_ids`; }

export function getCategoryIds(content: Record<string, string>): string[] {
  const ids = parseJSON<string[]>(
    content["curriculum_category_ids"],
    SEED_CATEGORIES.map((c) => c.id)
  );
  return ids.filter((id) => content[`category_${id}_deleted`] !== "1");
}

export function getCategoryTitle(content: Record<string, string>, id: string): string {
  return (
    content[categoryTitleKey(id)] ??
    SEED_CATEGORIES.find((c) => c.id === id)?.title ??
    "Untitled category"
  );
}

export function getCategoryCourseIds(content: Record<string, string>, id: string): string[] {
  return parseJSON<string[]>(
    content[categoryCoursesKey(id)],
    SEED_CATEGORIES.find((c) => c.id === id)?.courseIds ?? []
  );
}

export interface LiveCategory {
  id: string;
  title: string;
  courseIds: string[];
}

// Categories with their live course lists, in display order.
//
// `allCourseIds` should be every course that still exists. Courses listed in a
// category that no longer exist are dropped, a course listed in two categories
// stays in the first, and anything left over joins the fallback category, so
// adding a course never makes it unreachable.
export function buildCategories(
  content: Record<string, string>,
  allCourseIds: string[]
): LiveCategory[] {
  const featured = getFeaturedCourseId(content);
  const pool = allCourseIds.filter((id) => id !== featured);
  const taken = new Set<string>();

  const categories = getCategoryIds(content).map((id) => {
    const courseIds = getCategoryCourseIds(content, id).filter((cid) => {
      if (!pool.includes(cid) || taken.has(cid)) return false;
      taken.add(cid);
      return true;
    });
    return { id, title: getCategoryTitle(content, id), courseIds };
  });

  const orphans = pool.filter((cid) => !taken.has(cid));
  if (orphans.length > 0) {
    const fallback =
      categories.find((c) => c.id === FALLBACK_CATEGORY_ID) ??
      categories[categories.length - 1];
    if (fallback) fallback.courseIds = [...fallback.courseIds, ...orphans];
  }

  return categories;
}

// Id generators live at module scope so the clock is not read during render,
// which the React purity lint rule (rightly) objects to.
export function newCourseId(): { courseId: string; slugSuffix: string } {
  const ts = Date.now();
  return { courseId: `cdyn_${ts}`, slugSuffix: ts.toString().slice(-6) };
}

// A category id is its URL, so it is derived from the name once and kept.
export function newCategoryId(name: string, existing: string[]): string {
  const base =
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "category";
  return existing.includes(base) ? `${base}-${Date.now().toString().slice(-5)}` : base;
}

// Which category a course currently sits in, for the move dropdown.
export function categoryOfCourse(
  categories: LiveCategory[],
  courseId: string
): string | null {
  return categories.find((c) => c.courseIds.includes(courseId))?.id ?? null;
}
