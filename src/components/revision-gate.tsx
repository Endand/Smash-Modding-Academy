"use client";

import { useMemo } from "react";
import { ContentContext, useContentContext } from "@/components/content-provider";
import { canApproveEdits, type EditScope } from "@/hooks/use-permissions";
import { useAuth } from "@/components/auth-provider";
import { buildCourseStructure } from "@/lib/courses/course-structure";

// Re-provides the content context with `updateContent` redirected into the
// approval queue for anyone who can't approve edits in this scope. Every edit
// control in the subtree keeps calling updateContent exactly as before, so no
// call sites change — only where the write lands.
//
// This must wrap the editing component from OUTSIDE. A component reads
// useContentContext() at its own level, so a gate rendered inside its JSX
// would not cover the handlers that component defined for itself.
export function RevisionGate({ scope, children }: { scope: EditScope; children: React.ReactNode }) {
  const base = useContentContext();
  const { profile } = useAuth();

  const canApprove = canApproveEdits(profile, base.liveContent, scope);
  const courseId = scope.type === "site" ? null : scope.courseId;
  const lessonKey = scope.type === "lesson" ? scope.lessonKey : null;

  // Every lesson key in this course, longest first, so a content key can be
  // attributed to the lesson it belongs to rather than to whichever page the
  // edit happened on. Renaming a lesson from the course overview then shows up
  // for review on that lesson's own page too, not only on the course page.
  const lessonKeys = useMemo(() => {
    if (!courseId) return [];
    return buildCourseStructure(courseId, base.liveContent)
      .allLessons.map((l) => l.lessonKey)
      .sort((a, b) => b.length - a.length);
  }, [courseId, base.liveContent]);

  const value = useMemo(() => {
    // Approvers (and anything outside a course/lesson scope) publish directly.
    if (canApprove || courseId === null) return base;
    const lessonFor = (key: string) =>
      lessonKeys.find((lk) => key === lk || key.startsWith(`${lk}_`)) ?? lessonKey;
    return {
      ...base,
      updateContent: (key: string, val: string) =>
        base.proposeChange(key, val, { courseId, lessonKey: lessonFor(key) }),
    };
  }, [base, canApprove, courseId, lessonKey, lessonKeys]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
