"use client";

import { useAuth } from "@/components/auth-provider";
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

// Admins hold every permission; role-holders get whatever their role's
// permission map (edited on /admin) grants them.
export function usePermissions() {
  const { profile } = useAuth();
  const { content } = useContentContext();
  const isAdmin = !!profile?.is_admin;

  const can = (perm: Permission): boolean => {
    if (isAdmin) return true;
    const role = profile?.role;
    if (!role) return false;
    try {
      const perms = JSON.parse(content[rolePermKey(role)] ?? "{}") as Record<string, boolean>;
      return !!perms[perm];
    } catch {
      return false;
    }
  };

  return { can, isAdmin };
}
