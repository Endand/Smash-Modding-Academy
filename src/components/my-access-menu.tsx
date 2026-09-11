"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { roleColor } from "@/lib/role-color";

// The role badge in the nav — links to the full /my-access page. Admins can
// hold a role as well, and then show both: the Admin link and this badge.
export function MyAccessMenu() {
  const { profile } = useAuth();
  if (!profile?.role) return null;
  const color = roleColor(profile.role);

  return (
    <Link
      href="/my-access"
      title="Your edit access"
      className="hidden sm:inline-flex items-center font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-[var(--radius-tag)] transition-opacity hover:opacity-80"
      style={{ color, border: `1px solid ${color}` }}
    >
      {profile.role}
    </Link>
  );
}
