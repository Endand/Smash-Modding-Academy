"use client";

import { useMemo } from "react";
import { useContentContext } from "@/components/content-provider";
import { buildCourseStructure } from "@/lib/courses/course-structure";

// Pure helpers live in lib/courses/course-structure; re-export so existing
// imports from this module keep working.
export * from "@/lib/courses/course-structure";

export function useCourseStructure(courseId: string = "foundations") {
  const { content } = useContentContext();
  return useMemo(() => buildCourseStructure(courseId, content), [courseId, content]);
}
