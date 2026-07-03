"use client";

import { useMemo } from "react";
import { useContentContext } from "@/components/content-provider";
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

function parseJSON<T>(str: string | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; }
  catch { return fallback; }
}

export function useCourseStructure(courseId: string = "foundations") {
  const { content } = useContentContext();

  return useMemo((): { sections: LiveSection[]; allLessons: LiveLesson[] } => {
    // Static seed only exists for the foundations course
    const staticSections = courseId === "foundations" ? FOUNDATIONS_SECTIONS : [];

    const sectionIds: string[] = parseJSON(
      content[`${courseId}_section_ids`],
      staticSections.map((_, i) => `s${i}`)
    );

    const sections: LiveSection[] = [];
    for (const sId of sectionIds) {
      const sectionKey = `${courseId}_${sId}`;
      if (content[`${sectionKey}_deleted`] === "1") continue;

      const staticIdx =
        courseId === "foundations" && /^s\d+$/.test(sId)
          ? parseInt(sId.slice(1))
          : -1;
      const staticSection = staticIdx >= 0 ? (FOUNDATIONS_SECTIONS[staticIdx] ?? null) : null;

      const defaultLessonIds =
        staticSection?.lessons.map((l) => l.lessonKey.replace(`${courseId}_`, "")) ?? [];
      const lessonIds: string[] = parseJSON(
        content[`${sectionKey}_lesson_ids`],
        defaultLessonIds
      );

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
  }, [courseId, content]);
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

export { parseJSON };
