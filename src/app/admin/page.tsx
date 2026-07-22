"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Check, ChevronDown, Search, AlertTriangle } from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/components/auth-provider";
import { useContentContext } from "@/components/content-provider";
import { usePermissions, rolePermKey } from "@/hooks/use-permissions";
import { createClient } from "@/lib/supabase/client";
import { roleColor, ADMIN_COLOR } from "@/lib/role-color";

// ── Permission definitions ────────────────────────────────────────────────────

// Each permission is granted to a role and applies only inside lessons/courses
// the user has been given "Edit access" to (except the two admin-only ones).
const PERMISSIONS = [
  {
    key: "edit_content",
    label: "Edit Text Content",
    desc: "Click-to-edit any text — titles, headings, paragraphs, code / quote / callout blocks, outcomes, tasks — on granted lessons and courses.",
  },
  {
    key: "edit_icons",
    label: "Edit Lesson Icons",
    desc: "Change a lesson's icon in the sidebar and course list. A wrench-type icon also turns the lesson into a Project.",
  },
  {
    key: "manage_sections",
    label: "Manage Lesson Content",
    desc: "Inside a lesson: add, remove, and reorder sections, content blocks, learning outcomes, assignment steps, knowledge-check questions, and resources.",
  },
  {
    key: "manage_curriculum",
    label: "Add & Remove Lessons",
    desc: "On a granted course: create, remove, and reorder lessons and projects, and the course's sections. (Course-level structure.)",
  },
  {
    key: "manage_lessons",
    label: "Publish & Set Status",
    desc: 'Set a lesson or course to Published / Soon / Draft, and set a course\'s difficulty level. Controls what learners can see.',
  },
  {
    key: "view_drafts",
    label: "View Draft Lessons",
    desc: "See draft/unpublished lessons and projects on granted courses and lessons, read-only. For assistants reviewing work in progress.",
  },
  {
    key: "manage_access",
    label: "Grant Lesson Access",
    desc: "On a granted course: give or revoke other staff members' edit access to individual lessons in that course.",
  },
  {
    key: "edit_urls",
    label: "Edit Page URLs",
    desc: "Manually override a course or lesson URL slug. Titles still auto-sync the URL either way.",
  },
  {
    key: "edit_authors",
    label: "Edit Author Credits",
    desc: 'Set the "Written by" and "Edited by" staff credits at the bottom of a lesson.',
  },
  {
    key: "manage_courses",
    label: "Add & Remove Courses · admins only",
    desc: "Create and delete whole courses on the curriculum page. Site-wide, so it stays with admins even if toggled on for a role.",
  },
  {
    key: "manage_roles",
    label: "Manage Roles & Permissions · admins only",
    desc: "Open this panel and configure roles. Site-wide, so it stays with admins even if toggled on for a role.",
  },
] as const;

// ── Storage keys ──────────────────────────────────────────────────────────────

const ROLES_KEY = "__perm_roles__";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJSON<T>(str: string | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; }
  catch { return fallback; }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { loading } = useAuth();
  const { content, updateContent } = useContentContext();
  const { can, isAdmin } = usePermissions();
  const [addingRole, setAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [pendingRemoveRole, setPendingRemoveRole] = useState<string | null>(null);

  const canAccess = can("manage_roles");

  useEffect(() => {
    if (!loading && !canAccess) router.push("/");
  }, [loading, canAccess, router]);

  // One-time seed: create the "Editor" role (edit-only). Runs once ever, so an
  // admin who later deletes it won't have it re-created.
  useEffect(() => {
    if (loading || !isAdmin) return;
    if (content["__roles_seeded__"] === "1") return;
    const current: string[] = parseJSON(content[ROLES_KEY], []);
    if (!current.includes("Editor")) {
      updateContent(ROLES_KEY, JSON.stringify([...current, "Editor"]));
    }
    if (!content[rolePermKey("Editor")]) {
      updateContent(rolePermKey("Editor"), JSON.stringify({ edit_content: true }));
    }
    updateContent("__roles_seeded__", "1");
  }, [loading, isAdmin, content, updateContent]);

  // One-time migration: "Manage Lesson Content" used to also cover course-level
  // lesson add/remove. That's now a separate "Add & Remove Lessons" right, so
  // grant it to any role that already had the old bundled permission.
  useEffect(() => {
    if (loading || !isAdmin) return;
    if (content["__perms_v2__"] === "1") return;
    const current: string[] = parseJSON(content[ROLES_KEY], []);
    for (const role of current) {
      const perms = parseJSON<Record<string, boolean>>(content[rolePermKey(role)], {});
      if (perms.manage_sections && perms.manage_curriculum === undefined) {
        updateContent(rolePermKey(role), JSON.stringify({ ...perms, manage_curriculum: true }));
      }
    }
    updateContent("__perms_v2__", "1");
  }, [loading, isAdmin, content, updateContent]);

  // One-time migration v3: seed the Assistant role (draft viewer) and give
  // professor-type roles (manage_curriculum) the new Grant Lesson Access and
  // View Draft Lessons rights.
  useEffect(() => {
    if (loading || !isAdmin) return;
    if (content["__perms_v3__"] === "1") return;
    const current: string[] = parseJSON(content[ROLES_KEY], []);
    if (!current.includes("Assistant")) {
      updateContent(ROLES_KEY, JSON.stringify([...current, "Assistant"]));
    }
    if (!content[rolePermKey("Assistant")]) {
      updateContent(rolePermKey("Assistant"), JSON.stringify({ view_drafts: true }));
    }
    for (const role of current) {
      const perms = parseJSON<Record<string, boolean>>(content[rolePermKey(role)], {});
      if (perms.manage_curriculum && perms.manage_access === undefined) {
        updateContent(rolePermKey(role), JSON.stringify({ ...perms, manage_access: true, view_drafts: true }));
      }
    }
    updateContent("__perms_v3__", "1");
  }, [loading, isAdmin, content, updateContent]);

  if (loading || !canAccess) return null;

  // ── Data from site_content ────────────────────────────────────────────────
  const roles: string[] = parseJSON(content[ROLES_KEY], []);

  const getRolePerms = (role: string): Record<string, boolean> =>
    parseJSON(content[rolePermKey(role)], {});

  // ── Handlers ──────────────────────────────────────────────────────────────
  const togglePerm = (role: string, permKey: string) => {
    const perms = getRolePerms(role);
    updateContent(rolePermKey(role), JSON.stringify({ ...perms, [permKey]: !perms[permKey] }));
  };

  const commitAddRole = () => {
    const name = newRoleName.trim();
    if (!name || roles.map(r => r.toLowerCase()).includes(name.toLowerCase())) return;
    updateContent(ROLES_KEY, JSON.stringify([...roles, name]));
    setNewRoleName("");
    setAddingRole(false);
  };

  const removeRole = async (role: string) => {
    // Unassign the role from everyone who holds it (each set to "No role"),
    // then drop the role definition and its permission map.
    try {
      const supabase = createClient();
      const { data: holders } = await supabase.from("profiles").select("id").eq("role", role);
      await Promise.all(
        (holders ?? []).map((h: { id: string }) =>
          supabase.rpc("set_user_role", { target_id: h.id, new_role: "" })
        )
      );
    } catch (err) {
      console.error("[admin] role cleanup failed:", err);
    }
    updateContent(ROLES_KEY, JSON.stringify(roles.filter(r => r !== role)));
    updateContent(rolePermKey(role), "{}");
    setPendingRemoveRole(null);
  };

  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-16">

          {/* Header */}
          <div className="mb-12">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-3">
              Admin
            </p>
            <h1 className="text-3xl font-extralight tracking-wide text-[var(--text)] mb-4">
              Roles & Permissions
            </h1>
            <p className="text-sm leading-relaxed max-w-xl" style={{ color: "var(--text-muted)" }}>
              A role defines <em>what</em> a user can do; an admin grants <em>which</em> lessons or courses
              they can do it to, from each lesson&rsquo;s or course&rsquo;s &ldquo;Edit access&rdquo; box.
              Admins can edit everything, everywhere. Changes take effect immediately.
            </p>
          </div>

          {/* Table */}
          <div
            className="overflow-x-auto"
            style={{
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <table className="w-full border-collapse min-w-[480px]">
              <thead>
                <tr
                  style={{
                    background: "var(--surface)",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  {/* Permission column */}
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                    Permission
                  </th>

                  {/* Role columns */}
                  {roles.map((role) => (
                    <th
                      key={role}
                      className="px-5 py-3 text-center font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] min-w-[130px]"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: roleColor(role) }} />
                        <span style={{ color: roleColor(role) }}>{role}</span>
                        <button
                          onClick={() => setPendingRemoveRole(role)}
                          title={`Remove ${role} role`}
                          className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                          style={{ color: "#ed4245" }}
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    </th>
                  ))}

                  {/* Add Role column */}
                  <th className="px-5 py-3 text-center min-w-[130px]">
                    {addingRole ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          autoFocus
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitAddRole();
                            if (e.key === "Escape") {
                              setAddingRole(false);
                              setNewRoleName("");
                            }
                          }}
                          placeholder="Role name"
                          className="w-24 px-2 py-1 text-[11px] font-mono bg-transparent outline-none"
                          style={{
                            border: "1px solid var(--border-strong)",
                            borderRadius: "var(--radius-button)",
                            color: "var(--text)",
                          }}
                        />
                        <button
                          onClick={commitAddRole}
                          className="cursor-pointer"
                          style={{ color: "var(--accent-medium)" }}
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => { setAddingRole(false); setNewRoleName(""); }}
                          className="cursor-pointer"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingRole(true)}
                        className="flex items-center gap-1.5 mx-auto font-mono text-[10px] uppercase tracking-widest cursor-pointer transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                      >
                        <Plus size={11} />
                        Add Role
                      </button>
                    )}
                  </th>
                </tr>
              </thead>

              <tbody>
                {PERMISSIONS.map((perm, idx) => (
                  <tr
                    key={perm.key}
                    style={{
                      borderBottom:
                        idx < PERMISSIONS.length - 1
                          ? "1px solid var(--border-color)"
                          : "none",
                    }}
                  >
                    {/* Permission label + description */}
                    <td className="px-5 py-4">
                      <div className="text-sm text-[var(--text)] mb-0.5 font-light">
                        {perm.label}
                      </div>
                      <div
                        className="text-[12px] leading-snug"
                        style={{ color: "var(--text-muted)", opacity: 0.65 }}
                      >
                        {perm.desc}
                      </div>
                    </td>

                    {/* Toggle cells for each role */}
                    {roles.map((role) => {
                      const perms = getRolePerms(role);
                      const enabled = !!perms[perm.key];
                      return (
                        <td key={role} className="px-5 py-4 text-center">
                          <button
                            onClick={() => togglePerm(role, perm.key)}
                            className="w-5 h-5 rounded flex items-center justify-center mx-auto cursor-pointer transition-all"
                            style={{
                              background: enabled ? "var(--accent)" : "transparent",
                              border: enabled
                                ? "1px solid var(--accent)"
                                : "1px solid var(--border-strong)",
                            }}
                            title={enabled ? "Revoke permission" : "Grant permission"}
                          >
                            {enabled && <Check size={11} color="#fff" strokeWidth={2.5} />}
                          </button>
                        </td>
                      );
                    })}

                    {/* Spacer for Add Role column */}
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty state */}
            {roles.length === 0 && (
              <div
                className="px-5 py-14 text-center text-[13px] italic"
                style={{ color: "var(--text-muted)", opacity: 0.45 }}
              >
                No roles yet. Click "Add Role" above to create one.
              </div>
            )}
          </div>

          {/* Footer note */}
          <p
            className="mt-5 text-[11px] font-mono leading-relaxed"
            style={{ color: "var(--text-muted)", opacity: 0.4 }}
          >
            Full admin access is always granted to users with{" "}
            <code>is_admin = true</code> in the profiles table, regardless of role.
            Assigning roles to users and the admin flag itself stay admin-only and
            can&apos;t be delegated to a role.
          </p>

          {/* Users — role assignment (full admins only) */}
          {isAdmin && <UsersSection roles={roles} />}
        </div>
      </main>

      {pendingRemoveRole && (
        <RemoveRoleDialog
          role={pendingRemoveRole}
          onCancel={() => setPendingRemoveRole(null)}
          onConfirm={() => removeRole(pendingRemoveRole)}
        />
      )}
    </>
  );
}

// ── Remove-role confirmation dialog ───────────────────────────────────────────

function RemoveRoleDialog({
  role, onCancel, onConfirm,
}: {
  role: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [holders, setHolders] = useState<number | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", role);
        setHolders(count ?? 0);
      } catch {
        setHolders(0);
      }
    })();
  }, [role]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onCancel}
    >
      <div
        className="max-w-sm w-full p-6 flex flex-col gap-4"
        style={{ background: "var(--bg)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: "var(--accent-medium)" }} />
          <div>
            <p className="text-sm text-[var(--text)] font-light leading-snug">
              Remove the <strong className="font-medium">{role}</strong> role?
            </p>
            <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {holders === null
                ? "Checking who holds this role…"
                : holders === 0
                ? "No users currently hold this role."
                : `${holders} user${holders === 1 ? "" : "s"} currently hold this role and will be set to No role.`}{" "}
              Their per-lesson and per-course edit grants stay, but stop working until they&apos;re given another role.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={working}
            className="px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)]"
            style={{ border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
          >
            Cancel
          </button>
          <button
            onClick={async () => { setWorking(true); await onConfirm(); }}
            disabled={working || holders === null}
            className="px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {working ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Users section ─────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  username: string;
  is_admin: boolean;
  role: string | null;
}

function UsersSection({ roles }: { roles: string[] }) {
  // Only admins + role-holders are loaded for the groups (a bounded set) — a
  // plain select is capped at 1000 rows, so loading *all* users would drop
  // role-holders once the site passes 1000 registered users.
  const [staff, setStaff] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);

  const loadStaff = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, is_admin, role")
        .or("is_admin.eq.true,role.not.is.null")
        .order("username");
      if (error) throw error;
      setStaff((data ?? []) as UserRow[]);
    } catch {
      setError("Couldn't load users — make sure features_schema.sql has been run.");
    }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  // Search hits the DB so any user is findable regardless of total user count.
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("profiles")
          .select("id, username, is_admin, role")
          .ilike("username", `%${q.replace(/[%_]/g, "")}%`)
          .order("username")
          .limit(20);
        if (!cancelled) setResults((data ?? []) as UserRow[]);
      } catch { if (!cancelled) setResults([]); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const assignRole = async (userId: string, role: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("set_user_role", { target_id: userId, new_role: role });
      if (error) throw error;
      // Update search results in place, and refresh the groups (the user may have
      // just gained or lost a role).
      setResults((rs) => rs.map((r) => (r.id === userId ? { ...r, role: role || null } : r)));
      loadStaff();
    } catch (err) {
      console.error("[admin] role assignment failed:", err);
    }
  };

  const q = query.trim();
  const admins = (staff ?? []).filter((u) => u.is_admin);
  const usersInRole = (role: string) => (staff ?? []).filter((u) => !u.is_admin && u.role === role);

  return (
    <div className="mt-14">
      <h2 className="text-xl font-extralight tracking-wide text-[var(--text)] mb-2">Users</h2>
      <p className="text-[12px] mb-5" style={{ color: "var(--text-muted)", opacity: 0.65 }}>
        Search for a user to assign a role. Users without a role only appear in search results.
      </p>

      {error && (
        <p className="text-[12px] font-mono" style={{ color: "var(--accent-medium)" }}>{error}</p>
      )}

      {staff && (
        <>
          {/* Search */}
          <div
            className="flex items-center gap-2.5 px-4 mb-6"
            style={{ border: "1px solid var(--border-strong)", borderRadius: "var(--radius-card)" }}
          >
            <Search size={13} className="shrink-0" style={{ color: "var(--text-muted)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users by username…"
              className="flex-1 py-2.5 bg-transparent outline-none text-sm"
              style={{ color: "var(--text)" }}
            />
            {query && (
              <button onClick={() => setQuery("")} className="cursor-pointer shrink-0" style={{ color: "var(--text-muted)" }}>
                <X size={12} />
              </button>
            )}
          </div>

          {q ? (
            /* Search results — every user is findable here, role or not */
            <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
              {results.map((u, i) => (
                <UserRowItem key={u.id} user={u} roles={roles} onAssign={assignRole} isLast={i === results.length - 1} />
              ))}
              {results.length === 0 && (
                <p className="px-5 py-8 text-center text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.45 }}>
                  No users matching “{query.trim()}”.
                </p>
              )}
            </div>
          ) : (
            /* Grouped by role — users without a role stay hidden */
            <div className="flex flex-col gap-8">
              <RoleGroup
                label="Admins"
                users={admins}
                roles={roles}
                onAssign={assignRole}
                emptyNote="No admins."
              />
              {roles.map((role) => (
                <RoleGroup
                  key={role}
                  label={role}
                  users={usersInRole(role)}
                  roles={roles}
                  onAssign={assignRole}
                  emptyNote="No users with this role yet — search above to assign it."
                />
              ))}
              {roles.length === 0 && (
                <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                  No roles defined yet — add one in the table above.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RoleGroup({
  label, users, roles, onAssign, emptyNote,
}: {
  label: string;
  users: UserRow[];
  roles: string[];
  onAssign: (userId: string, role: string) => void;
  emptyNote: string;
}) {
  const color = label === "Admins" ? ADMIN_COLOR : roleColor(label);
  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
          <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: color }} />
          {label} <span style={{ opacity: 0.5 }}>({users.length})</span>
        </span>
        <div className="h-px flex-1 bg-[var(--border-color)]" />
      </div>
      {users.length > 0 ? (
        <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
          {users.map((u, i) => (
            <UserRowItem key={u.id} user={u} roles={roles} onAssign={onAssign} isLast={i === users.length - 1} />
          ))}
        </div>
      ) : (
        <p className="text-[12px] italic" style={{ color: "var(--text-muted)", opacity: 0.45 }}>{emptyNote}</p>
      )}
    </div>
  );
}

function UserRowItem({
  user, roles, onAssign, isLast,
}: {
  user: UserRow;
  roles: string[];
  onAssign: (userId: string, role: string) => void;
  isLast: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-3"
      style={{ borderBottom: !isLast ? "1px solid var(--border-color)" : "none" }}
    >
      <span className="text-sm font-mono" style={{ color: "var(--text)" }}>@{user.username}</span>
      {user.is_admin ? (
        <span
          className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-tag)]"
          style={{ color: ADMIN_COLOR, border: `1px solid ${ADMIN_COLOR}` }}
        >
          Admin
        </span>
      ) : (
        <div className="relative inline-flex items-center">
          <select
            value={user.role ?? ""}
            onChange={(e) => onAssign(user.id, e.target.value)}
            className="appearance-none font-mono text-[10px] uppercase tracking-widest px-2 py-1 pr-6 rounded-[var(--radius-tag)] cursor-pointer bg-transparent outline-none"
            style={{
              color: user.role ? roleColor(user.role) : "var(--text-muted)",
              border: `1px solid ${user.role ? roleColor(user.role) : "var(--border-strong)"}`,
            }}
          >
            <option value="">No role</option>
            {/* Role the user still holds but which was deleted from the table */}
            {user.role && !roles.includes(user.role) && (
              <option value={user.role}>{user.role} (removed)</option>
            )}
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown size={8} className="absolute right-1.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        </div>
      )}
    </div>
  );
}
