"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Check, ChevronDown, Search } from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/components/auth-provider";
import { useContentContext } from "@/components/content-provider";
import { usePermissions, rolePermKey } from "@/hooks/use-permissions";
import { createClient } from "@/lib/supabase/client";

// ── Permission definitions ────────────────────────────────────────────────────

const PERMISSIONS = [
  {
    key: "edit_content",
    label: "Edit Text Content",
    desc: "Click-to-edit any text field on lessons, course pages, and site-wide content (headers, footers, descriptions)",
  },
  {
    key: "manage_sections",
    label: "Manage Lesson Sections",
    desc: "Add and remove sections, learning outcomes, assignment tasks, knowledge check questions, and resources on lesson pages",
  },
  {
    key: "edit_icons",
    label: "Edit Lesson Icons",
    desc: "Change the icon shown for each lesson in the course sidebar and overview (also controls the Project badge)",
  },
  {
    key: "manage_lessons",
    label: "Manage Lesson Availability",
    desc: 'Publish and unpublish lessons and courses — controls whether they link out or show "Soon", plus lesson difficulty levels',
  },
  {
    key: "manage_courses",
    label: "Add & Remove Courses",
    desc: "Create new courses and remove existing ones from the curriculum page, and view removed courses",
  },
  {
    key: "edit_urls",
    label: "Edit Page URLs",
    desc: "Manually override the URL slug of a course or lesson (titles still auto-sync the URL either way)",
  },
  {
    key: "edit_authors",
    label: "Edit Author Credits",
    desc: 'Set the "Written by" and "Edited by" staff credits shown at the bottom of each lesson',
  },
  {
    key: "manage_roles",
    label: "Manage Roles & Permissions",
    desc: "Access this panel and configure what each role is allowed to do across the site",
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

  const canAccess = can("manage_roles");

  useEffect(() => {
    if (!loading && !canAccess) router.push("/");
  }, [loading, canAccess, router]);

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

  const removeRole = (role: string) => {
    updateContent(ROLES_KEY, JSON.stringify(roles.filter(r => r !== role)));
    updateContent(rolePermKey(role), "{}");
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
              Define what each role can do across the site. Roles are assigned to users separately.
              Changes take effect immediately for all sessions.
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
                        <span>{role}</span>
                        <button
                          onClick={() => removeRole(role)}
                          title={`Remove ${role} role`}
                          className="opacity-30 hover:opacity-100 transition-opacity cursor-pointer"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <X size={10} />
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
    </>
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
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, is_admin, role")
          .order("username");
        if (error) throw error;
        setUsers((data ?? []) as UserRow[]);
      } catch {
        setError("Couldn't load users — make sure features_schema.sql has been run.");
      }
    })();
  }, []);

  const assignRole = async (userId: string, role: string) => {
    const prev = users;
    setUsers((u) => u?.map((row) => (row.id === userId ? { ...row, role: role || null } : row)) ?? null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("set_user_role", { target_id: userId, new_role: role });
      if (error) throw error;
    } catch (err) {
      console.error("[admin] role assignment failed:", err);
      setUsers(prev ?? null);
    }
  };

  const q = query.trim().toLowerCase();
  const results = q ? (users ?? []).filter((u) => u.username.toLowerCase().includes(q)).slice(0, 20) : [];
  const admins = (users ?? []).filter((u) => u.is_admin);
  const usersInRole = (role: string) => (users ?? []).filter((u) => !u.is_admin && u.role === role);

  return (
    <div className="mt-14">
      <h2 className="text-xl font-extralight tracking-wide text-[var(--text)] mb-2">Users</h2>
      <p className="text-[12px] mb-5" style={{ color: "var(--text-muted)", opacity: 0.65 }}>
        Search for a user to assign a role. Users without a role only appear in search results.
      </p>

      {error && (
        <p className="text-[12px] font-mono" style={{ color: "var(--accent-medium)" }}>{error}</p>
      )}

      {users && (
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
  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <span className="font-mono text-[11px] uppercase tracking-widest whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
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
          style={{ color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }}
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
              color: user.role ? "var(--accent-medium)" : "var(--text-muted)",
              border: `1px solid ${user.role ? "var(--accent-medium)" : "var(--border-strong)"}`,
            }}
          >
            <option value="">No role</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown size={8} className="absolute right-1.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        </div>
      )}
    </div>
  );
}
