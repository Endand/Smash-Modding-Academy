"use client";

import { createContext, createElement, useContext } from "react";
import { useAuth, type Profile } from "@/components/auth-provider";
import { useContentContext } from "@/components/content-provider";
import { hasPreviewGrant } from "@/lib/preview-token";

// Permission keys defined on the /admin Roles & Permissions panel.
export type Permission =
  | "edit_content"
  | "edit_icons"
  | "manage_sections"
  | "manage_curriculum"
  | "manage_lessons"
  | "view_drafts"
  | "manage_access"
  | "edit_urls"
  | "edit_authors"
  | "manage_courses"
  | "manage_roles";

// site_content key holding the permission map for a role
export function rolePermKey(role: string) {
  return `__perm_${role.toLowerCase().replace(/\s+/g, "_")}__`;
}

// ── Edit scope ────────────────────────────────────────────────────────────────
// A role-holder's permissions are scoped: they only apply inside a lesson or
// course an admin has granted them. Everything not wrapped in a scope provider
// (nav, homepage, footer, curriculum listing) is "site" scope — admin-only.

export type EditScope =
  | { type: "site" }
  | { type: "course"; courseId: string }
  | { type: "lesson"; courseId: string; lessonKey: string };

const EditScopeContext = createContext<EditScope>({ type: "site" });

export function EditScopeProvider({ scope, children }: { scope: EditScope; children: React.ReactNode }) {
  return createElement(EditScopeContext.Provider, { value: scope }, children);
}

export function useEditScope() {
  return useContext(EditScopeContext);
}

// ── Preview mode ──────────────────────────────────────────────────────────────
// When on, an editor's edit permissions read as false so the page renders exactly
// as a reader sees it (markdown formatted, no edit affordances). Access/gating
// uses the real permissions instead, so previewing a draft still shows content.

const PreviewModeContext = createContext(false);

export function PreviewModeProvider({ value, children }: { value: boolean; children: React.ReactNode }) {
  return createElement(PreviewModeContext.Provider, { value }, children);
}

export function usePreviewMode() {
  return useContext(PreviewModeContext);
}

// ── Secret preview links ──────────────────────────────────────────────────────
// The `?preview=<token>` value for the current page, supplied by the route's
// server component. A matching token unlocks unpublished content for anyone.

const PreviewTokenContext = createContext<string | null>(null);

export function PreviewTokenProvider({ token, children }: { token: string | null; children: React.ReactNode }) {
  return createElement(PreviewTokenContext.Provider, { value: token }, children);
}

export function usePreviewToken() {
  return useContext(PreviewTokenContext);
}

// site_content keys holding the edit-access username lists
export function lessonAclKey(lessonKey: string) { return `${lessonKey}_edit_acl`; }
export function courseAclKey(courseId: string) { return `course_${courseId}_edit_acl`; }

function aclUsers(content: Record<string, string>, key: string): string[] {
  try { return JSON.parse(content[key] ?? "[]") as string[]; }
  catch { return []; }
}

// Does `username` have an admin-granted right to edit this scope?
export function hasScopeAccess(
  username: string | undefined,
  content: Record<string, string>,
  scope: EditScope
): boolean {
  if (!username || scope.type === "site") return false;
  if (scope.type === "course") {
    return aclUsers(content, courseAclKey(scope.courseId)).includes(username);
  }
  // lesson: granted the lesson directly, or granted its whole course
  return (
    aclUsers(content, lessonAclKey(scope.lessonKey)).includes(username) ||
    aclUsers(content, courseAclKey(scope.courseId)).includes(username)
  );
}

// Pure permission check — usable outside React (e.g. inside a .map() where
// hooks can't run). Admins can do everything; a role-holder can do X in a
// scope only if their role grants X and they've been granted that scope.
export function evalPermission(
  profile: Profile | null,
  content: Record<string, string>,
  scope: EditScope,
  perm: Permission
): boolean {
  if (profile?.is_admin) return true;
  const role = profile?.role;
  if (!role) return false;

  let rolePerms: Record<string, boolean>;
  try { rolePerms = JSON.parse(content[rolePermKey(role)] ?? "{}"); }
  catch { return false; }
  if (!rolePerms[perm]) return false;

  return hasScopeAccess(profile?.username, content, scope);
}

// Can this user see unpublished (draft / soon) content in this scope?
// Anyone who can act on it here — publish, view drafts, or edit — may see it.
// Since permissions are scoped, an editor only gains this on lessons they're
// granted, so they still never see drafts they have no access to.
export function canSeeDrafts(
  profile: Profile | null,
  content: Record<string, string>,
  scope: EditScope
): boolean {
  return (
    evalPermission(profile, content, scope, "manage_lessons") ||
    evalPermission(profile, content, scope, "view_drafts") ||
    evalPermission(profile, content, scope, "edit_content")
  );
}

// Does the user have edit access to this course, or to any lesson inside it?
// Used to reveal a draft/soon course to people granted content within it.
export function hasAnyEditAccessInCourse(
  username: string | undefined,
  content: Record<string, string>,
  courseId: string,
  lessonKeys: string[]
): boolean {
  if (!username) return false;
  const inAcl = (key: string) => {
    try { return (JSON.parse(content[key] ?? "[]") as string[]).includes(username); }
    catch { return false; }
  };
  if (inAcl(courseAclKey(courseId))) return true;
  return lessonKeys.some((lk) => inAcl(lessonAclKey(lk)));
}

export function usePermissions(scopeOverride?: EditScope) {
  const { profile } = useAuth();
  const { content } = useContentContext();
  const ctxScope = useEditScope();
  const previewMode = useContext(PreviewModeContext);
  const previewToken = useContext(PreviewTokenContext);
  const scope = scopeOverride ?? ctxScope;

  // In preview mode, edit permissions read false so the UI renders as a reader's.
  const can = (perm: Permission): boolean => (previewMode ? false : evalPermission(profile, content, scope, perm));
  // `canReal` ignores preview mode — for access/gating that must not be suppressed.
  const canReal = (perm: Permission): boolean => evalPermission(profile, content, scope, perm);

  // A valid `?preview=` token unlocks viewing unpublished content in this scope.
  // It grants read access only — never any edit permission.
  const previewGrant =
    scope.type === "site"
      ? false
      : hasPreviewGrant(
          previewToken,
          content,
          scope.courseId,
          scope.type === "lesson" ? scope.lessonKey : undefined
        );

  return {
    can,
    canReal,
    isAdmin: previewMode ? false : !!profile?.is_admin,
    isAdminReal: !!profile?.is_admin,
    previewMode,
    previewToken,
    previewGrant,
    scope,
  };
}
