"use client";

import { useMemo } from "react";
import { ContentContext, useContentContext } from "@/components/content-provider";
import { canApproveEdits, type EditScope } from "@/hooks/use-permissions";
import { useAuth } from "@/components/auth-provider";

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

  const value = useMemo(() => {
    // Approvers (and anything outside a course/lesson scope) publish directly.
    if (canApprove || courseId === null) return base;
    return {
      ...base,
      updateContent: (key: string, val: string) =>
        base.proposeChange(key, val, { courseId, lessonKey }),
    };
  }, [base, canApprove, courseId, lessonKey]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
