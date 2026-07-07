"use client";

import { createContext, createElement, useContext } from "react";
import { useAuth, type Profile } from "@/components/auth-provider";
import { useContentContext } from "@/components/content-provider";

// Permission keys defined on the /admin Roles & Permissions panel.
export type Permission =
  | "edit_content"
  | "manage_sections"
  | "edit_icons"
  | "manage_lessons"
  | "manage_courses"
  | "edit_urls"
  | "edit_authors"
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

export function usePermissions(scopeOverride?: EditScope) {
  const { profile } = useAuth();
  const { content } = useContentContext();
  const ctxScope = useEditScope();
  const scope = scopeOverride ?? ctxScope;

  const can = (perm: Permission): boolean => evalPermission(profile, content, scope, perm);

  return { can, isAdmin: !!profile?.is_admin, scope };
}
