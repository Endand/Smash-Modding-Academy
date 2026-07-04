// Automatic URL slug sync: when a course or lesson title changes, the slug
// follows. Called by ContentProvider.updateContent on the editing client, so
// it applies no matter where the title was edited from.

import { buildCourseStructure, parseJSON } from "./course-structure";
import { getCourseKeys, getCourseSlug, slugFromTitle, SEED_COURSE_IDS } from "./course-utils";

// Returns extra [key, value] writes to perform alongside the title write.
export function computeSlugSync(
  key: string,
  value: string,
  content: Record<string, string>
): [string, string][] {
  if (!key.endsWith("_title")) return [];

  const courseIds = Array.from(new Set([
    ...parseJSON<string[]>(content["curriculum_course_ids"], []),
    ...SEED_COURSE_IDS,
  ]));

  // Course title changed → sync course slug + curriculum slug map
  for (const courseId of courseIds) {
    if (getCourseKeys(courseId).titleKey !== key) continue;
    const newSlug = slugFromTitle(value);
    const oldSlug = getCourseSlug(courseId, content);
    if (newSlug === oldSlug) return [];
    const map = parseJSON<Record<string, string>>(content["curriculum_slug_map"], {});
    return [
      [`course_${courseId}_slug`, newSlug],
      ["curriculum_slug_map", JSON.stringify({ ...map, [newSlug]: courseId })],
    ];
  }

  // Lesson title changed → sync lesson slug + the course's slug map.
  // Matched against the actual course structure so keys like
  // `<lesson>_res0_title` can't false-positive.
  for (const courseId of courseIds) {
    if (!key.startsWith(`${courseId}_`)) continue;
    const lk = key.slice(0, -"_title".length);
    const lesson = buildCourseStructure(courseId, content).allLessons
      .find((l) => l.lessonKey === lk);
    if (!lesson) continue;
    const newSlug = slugFromTitle(value);
    if (newSlug === lesson.slug) return [];
    const map = parseJSON<Record<string, string>>(content[`${courseId}_slug_map`], {});
    return [
      [`${lk}_slug`, newSlug],
      [`${courseId}_slug_map`, JSON.stringify({ ...map, [newSlug]: lk })],
    ];
  }

  return [];
}
