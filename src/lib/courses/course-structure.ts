// Pure course-structure helpers — no React imports, safe to use anywhere
// (client components, providers, and server code alike).

import { FOUNDATIONS_SECTIONS } from "@/lib/courses/foundations-data";

export interface LiveLesson {
  lessonKey: string;
  slug: string;
  titleFallback: string;
  iconFallback: string;
  hasStaticContent: boolean;
}

export interface LiveSection {
  sectionId: string;
  sectionKey: string;
  titleFallback: string;
  lessons: LiveLesson[];
}

export function parseJSON<T>(str: string | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; }
  catch { return fallback; }
}

// Full section id array (including deleted ids) — the source of truth for order
export function getSectionIdList(courseId: string, content: Record<string, string>): string[] {
  const staticSections = courseId === "foundations" ? FOUNDATIONS_SECTIONS : [];
  return parseJSON(
    content[`${courseId}_section_ids`],
    staticSections.map((_, i) => `s${i}`)
  );
}

function getStaticSection(courseId: string, sId: string) {
  const staticIdx =
    courseId === "foundations" && /^s\d+$/.test(sId)
      ? parseInt(sId.slice(1))
      : -1;
  return staticIdx >= 0 ? (FOUNDATIONS_SECTIONS[staticIdx] ?? null) : null;
}

// Full lesson id array for a section (including deleted ids)
export function getLessonIdList(courseId: string, sId: string, content: Record<string, string>): string[] {
  const staticSection = getStaticSection(courseId, sId);
  const defaultLessonIds =
    staticSection?.lessons.map((l) => l.lessonKey.replace(`${courseId}_`, "")) ?? [];
  return parseJSON(content[`${courseId}_${sId}_lesson_ids`], defaultLessonIds);
}

// Swap an id with its nearest visible neighbor in the given direction.
// Returns the new array, or null if the move isn't possible.
export function moveVisible(
  ids: string[],
  id: string,
  dir: -1 | 1,
  isVisible: (id: string) => boolean
): string[] | null {
  const idx = ids.indexOf(id);
  if (idx < 0) return null;
  let j = idx + dir;
  while (j >= 0 && j < ids.length && !isVisible(ids[j])) j += dir;
  if (j < 0 || j >= ids.length) return null;
  const next = [...ids];
  [next[idx], next[j]] = [next[j], next[idx]];
  return next;
}

// Pure structure builder — usable outside React (search, slug sync, metadata)
export function buildCourseStructure(
  courseId: string,
  content: Record<string, string>
): { sections: LiveSection[]; allLessons: LiveLesson[] } {
  const sectionIds = getSectionIdList(courseId, content);

  const sections: LiveSection[] = [];
  for (const sId of sectionIds) {
    const sectionKey = `${courseId}_${sId}`;
    if (content[`${sectionKey}_deleted`] === "1") continue;

    const staticSection = getStaticSection(courseId, sId);
    const lessonIds = getLessonIdList(courseId, sId, content);

    const lessons: LiveLesson[] = [];
    for (const lId of lessonIds) {
      const lk = `${courseId}_${lId}`;
      if (content[`${lk}_deleted`] === "1") continue;

      const staticLesson =
        staticSection?.lessons.find((l) => l.lessonKey === lk) ?? null;

      lessons.push({
        lessonKey: lk,
        slug: content[`${lk}_slug`] ?? staticLesson?.slug ?? lId,
        titleFallback: staticLesson?.titleFallback ?? "Untitled Lesson",
        iconFallback:  staticLesson?.iconFallback  ?? "BookOpen",
        hasStaticContent: !!staticLesson?.content,
      });
    }

    sections.push({
      sectionId: sId,
      sectionKey,
      titleFallback: staticSection?.titleFallback ?? "Untitled Section",
      lessons,
    });
  }

  const allLessons = sections.flatMap((s) => s.lessons);
  return { sections, allLessons };
}

export function getEffectiveStatus(
  lessonKey: string,
  hasStaticContent: boolean,
  content: Record<string, string>
): "published" | "soon" | "draft" {
  const stored = content[`${lessonKey}_status`];
  if (stored === "published" || stored === "soon" || stored === "draft") return stored;
  return hasStaticContent ? "published" : "soon";
}
