"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Github, ExternalLink, Paperclip, Download, Plus } from "lucide-react";
import { createClient, withTimeout } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useContentContext } from "@/components/content-provider";
import { Editable } from "@/components/editable-text";
import { RemoveBtn } from "@/components/remove-btn";
import {
  uploadToBucket, formatBytes, downloadUrl,
  PROJECT_FILES_BUCKET, MAX_PROJECT_FILE_BYTES,
} from "@/lib/uploads";

// ── Keys ──────────────────────────────────────────────────────────────────────
// Submissions are off until someone with edit rights on the project turns them
// on, so the section only appears where the lesson actually wants solutions.
export const submissionsEnabledKey = (lessonKey: string) => `${lessonKey}_submissions_enabled`;
export const submissionsIntroKey = (lessonKey: string) => `${lessonKey}_submissions_intro`;

export interface Submission {
  id: string;
  lesson_key: string;
  user_id: string;
  username: string | null;
  repo_url: string;
  live_url: string | null;
  file_url: string | null;
  file_name: string | null;
  notes: string | null;
  created_at: string;
}

// Only ever render http(s). Bare hostnames are a normal way to paste a link, so
// they get a scheme rather than a rejection; anything else (javascript:, data:)
// returns null and is refused.
function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export function ProjectSubmissions({
  lessonKey,
  courseId,
  canManage,
}: {
  lessonKey: string;
  courseId: string;
  /** Lesson editors: may switch the section on or off and remove any entry. */
  canManage: boolean;
}) {
  const { content, updateContent } = useContentContext();
  const { user, profile } = useAuth();

  const [rows, setRows] = useState<Submission[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const enabled = content[submissionsEnabledKey(lessonKey)] === "1";

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await withTimeout(
        supabase
          .from("project_submissions")
          .select("*")
          .eq("lesson_key", lessonKey)
          .order("created_at", { ascending: false })
      );
      if (error) throw error;
      setRows((data ?? []) as Submission[]);
      setTableMissing(false);
    } catch (err) {
      // The table not existing yet is not an error worth showing a reader.
      console.error("[submissions] load failed:", err);
      setTableMissing(true);
    } finally {
      setLoaded(true);
    }
  }, [lessonKey]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  // Off, and nobody here can turn it on: render nothing at all.
  if (!enabled && !canManage) return null;

  const mine = rows.find((r) => r.user_id === user?.id) ?? null;

  return (
    <div className="mb-14">
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          Solutions
        </p>
        {canManage && <EnableToggle lessonKey={lessonKey} enabled={enabled} onToggle={updateContent} />}
      </div>

      {!enabled ? (
        <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
          Submissions are off. Turn them on to let anyone with an account post their build and link their GitHub.
        </p>
      ) : (
        <>
          <Editable
            as="p"
            contentKey={submissionsIntroKey(lessonKey)}
            fallback="Finished the project? Post it here so other people can see how you approached it, and so you can see how they approached it. Link the repository you worked in, and attach the built files if you want people to try it."
            className="text-[14px] leading-relaxed mb-6"
            style={{ color: "var(--text-muted)" }}
          />

          {tableMissing ? (
            <p className="text-[13px]" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
              Submissions are not available right now.
            </p>
          ) : (
            <>
              <SubmitBox
                lessonKey={lessonKey}
                courseId={courseId}
                existing={mine}
                signedIn={!!user}
                hasUsername={!!profile?.username}
                onSaved={load}
              />

              <div className="mt-8">
                {!loaded ? (
                  <p className="text-[13px]" style={{ color: "var(--text-muted)", opacity: 0.4 }}>
                    Loading…
                  </p>
                ) : rows.length === 0 ? (
                  <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                    Nobody has shared a solution yet. Be the first.
                  </p>
                ) : (
                  <>
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-4 opacity-50" style={{ color: "var(--text-muted)" }}>
                      {rows.length} {rows.length === 1 ? "solution" : "solutions"}
                    </p>
                    <ul className="flex flex-col gap-3">
                      {rows.map((r) => (
                        <SubmissionRow
                          key={r.id}
                          row={r}
                          canRemove={canManage || r.user_id === user?.id}
                          onRemoved={load}
                        />
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Editor control ────────────────────────────────────────────────────────────

function EnableToggle({
  lessonKey,
  enabled,
  onToggle,
}: {
  lessonKey: string;
  enabled: boolean;
  onToggle: (key: string, value: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(submissionsEnabledKey(lessonKey), enabled ? "0" : "1")}
      title={enabled ? "Hide the submissions section from this project" : "Let signed-in people post their solution"}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] transition-colors"
      style={enabled
        ? { background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }
        : { color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
    >
      {enabled ? "Submissions on" : "Submissions off"}
    </button>
  );
}

// ── One submission ────────────────────────────────────────────────────────────

function SubmissionRow({
  row,
  canRemove,
  onRemoved,
}: {
  row: Submission;
  canRemove: boolean;
  onRemoved: () => void;
}) {
  const [removing, setRemoving] = useState(false);

  const remove = async () => {
    setRemoving(true);
    try {
      const supabase = createClient();
      const { error } = await withTimeout(supabase.from("project_submissions").delete().eq("id", row.id));
      if (error) throw error;
      onRemoved();
    } catch (err) {
      console.error("[submissions] delete failed:", err);
      alert("Could not remove that submission. Try again.");
      setRemoving(false);
    }
  };

  const repo = normalizeUrl(row.repo_url ?? "");
  const live = normalizeUrl(row.live_url ?? "");

  return (
    <li
      className="group flex items-start gap-4 px-4 py-3.5"
      style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", background: "var(--surface)", opacity: removing ? 0.4 : 1 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="text-[13.5px]" style={{ color: "var(--text)" }}>
            {row.username || "Someone"}
          </span>
          <span className="font-mono text-[10px] opacity-40" style={{ color: "var(--text-muted)" }}>
            {formatDate(row.created_at)}
          </span>
        </div>

        {row.notes && (
          <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
            {row.notes}
          </p>
        )}

        <div className="flex items-center gap-4 flex-wrap mt-2.5">
          {repo && (
            <a
              href={repo}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="flex items-center gap-1.5 text-[12px] hover:underline"
              style={{ color: "var(--accent-medium)" }}
            >
              <Github size={13} strokeWidth={1.5} /> Repository
            </a>
          )}
          {live && (
            <a
              href={live}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="flex items-center gap-1.5 text-[12px] hover:underline"
              style={{ color: "var(--accent-medium)" }}
            >
              <ExternalLink size={13} strokeWidth={1.5} /> Showcase
            </a>
          )}
          {row.file_url && (
            <a
              href={downloadUrl(row.file_url, row.file_name ?? undefined)}
              download={row.file_name ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] hover:underline"
              style={{ color: "var(--accent-medium)" }}
            >
              <Download size={13} strokeWidth={1.5} /> {row.file_name || "Download"}
            </a>
          )}
        </div>
      </div>

      {canRemove && !removing && <RemoveBtn onClick={remove} title="Remove this submission" />}
    </li>
  );
}

// ── Submit / edit your own ────────────────────────────────────────────────────

function SubmitBox({
  lessonKey,
  courseId,
  existing,
  signedIn,
  hasUsername,
  onSaved,
}: {
  lessonKey: string;
  courseId: string;
  existing: Submission | null;
  signedIn: boolean;
  hasUsername: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [repo, setRepo] = useState("");
  const [live, setLive] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<{ url: string; name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Re-opening the form loads whatever is already posted, so editing is the
  // same flow as posting rather than a second, separate one.
  const openForm = () => {
    setRepo(existing?.repo_url ?? "");
    setLive(existing?.live_url ?? "");
    setNotes(existing?.notes ?? "");
    setFile(existing?.file_url ? { url: existing.file_url, name: existing.file_name ?? "Attachment", size: 0 } : null);
    setError("");
    setOpen(true);
  };

  if (!signedIn) {
    return (
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
        style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)" }}
      >
        <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
          Sign in to share what you built.
        </span>
        <Link
          href="/login"
          className="shrink-0 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest rounded-[var(--radius-button)] transition-transform hover:scale-[1.02]"
          style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!hasUsername) {
    return (
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
        style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)" }}
      >
        <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
          Pick a username before posting, so your solution has a name on it.
        </span>
        <Link
          href="/setup-username"
          className="shrink-0 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest rounded-[var(--radius-button)]"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
        >
          Choose one
        </Link>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={openForm}
        className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest cursor-pointer w-full justify-center transition-colors"
        style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)", color: "var(--text-muted)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; e.currentTarget.style.borderColor = "var(--accent-medium)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      >
        <Plus size={11} /> {existing ? "Edit your solution" : "Share your solution"}
      </button>
    );
  }

  const pickFile = async (f: File) => {
    if (f.size > MAX_PROJECT_FILE_BYTES) {
      setError(`That file is ${formatBytes(f.size)}. The limit is ${formatBytes(MAX_PROJECT_FILE_BYTES)}.`);
      return;
    }
    setError("");
    setUploading(true);
    try {
      setFile(await uploadToBucket(PROJECT_FILES_BUCKET, f, lessonKey));
    } catch (err) {
      console.error("[submissions] upload failed:", err);
      setError("That file could not be uploaded. Try again, or post just the links.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const repoUrl = normalizeUrl(repo);
    if (!repoUrl) {
      setError("Add a link to your repository. It needs to be a full web address.");
      return;
    }
    const liveUrl = live.trim() ? normalizeUrl(live) : null;
    if (live.trim() && !liveUrl) {
      setError("That showcase link does not look like a web address.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");

      // One row per person per project: posting again replaces what's there
      // instead of stacking duplicates for the same solution.
      const { error: err } = await withTimeout(
        supabase.from("project_submissions").upsert(
          {
            lesson_key: lessonKey,
            course_id: courseId,
            user_id: uid,
            repo_url: repoUrl,
            live_url: liveUrl,
            file_url: file?.url ?? null,
            file_name: file?.name ?? null,
            notes: notes.trim() ? notes.trim().slice(0, 600) : null,
          },
          { onConflict: "lesson_key,user_id" }
        )
      );
      if (err) throw err;
      setOpen(false);
      onSaved();
    } catch (err) {
      console.error("[submissions] save failed:", err);
      const msg = (err as { message?: string })?.message ?? "";
      setError(`Could not post that${msg ? `: ${msg}` : "."}`);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-button)",
    color: "var(--text)",
  };

  return (
    <div
      className="px-5 pt-4 pb-5 flex flex-col gap-3.5"
      style={{ border: "1px solid var(--accent-medium)", borderRadius: "var(--radius-card)", background: "var(--surface)" }}
    >
      <Field label="Repository link">
        <input
          autoFocus
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="https://github.com/you/your-project"
          className="w-full px-3 py-2 text-[13px] outline-none focus:border-[var(--accent-medium)]"
          style={inputStyle}
        />
      </Field>

      <Field label="Showcase link (optional)">
        <input
          value={live}
          onChange={(e) => setLive(e.target.value)}
          placeholder="A video, a GameBanana page, anything that shows it working"
          className="w-full px-3 py-2 text-[13px] outline-none focus:border-[var(--accent-medium)]"
          style={inputStyle}
        />
      </Field>

      <Field label="Notes (optional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 600))}
          rows={3}
          placeholder="What you made, what you got stuck on, anything you'd do differently."
          className="w-full px-3 py-2 text-[13px] outline-none resize-none focus:border-[var(--accent-medium)]"
          style={inputStyle}
        />
      </Field>

      <Field label="File (optional)">
        <div className="flex items-center gap-3">
          <label
            className="shrink-0 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] transition-colors"
            style={{ border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
          >
            <input
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }}
            />
            {uploading ? "Uploading…" : file ? "Replace" : "Choose file"}
          </label>
          {file ? (
            <span className="flex items-center gap-1.5 text-[12px] min-w-0" style={{ color: "var(--text-muted)" }}>
              <Paperclip size={12} strokeWidth={1.5} className="shrink-0" />
              <span className="truncate">{file.name}</span>
              {file.size > 0 && <span className="opacity-50 shrink-0">{formatBytes(file.size)}</span>}
              <button
                onClick={() => setFile(null)}
                className="ml-1 shrink-0 opacity-50 hover:opacity-100 cursor-pointer underline"
              >
                remove
              </button>
            </span>
          ) : (
            <span className="text-[11px] opacity-45" style={{ color: "var(--text-muted)" }}>
              Up to {formatBytes(MAX_PROJECT_FILE_BYTES)}
            </span>
          )}
        </div>
      </Field>

      {error && (
        <p className="text-[12px]" style={{ color: "#ed4245" }}>
          {error}
        </p>
      )}

      <div className="flex items-center gap-2.5 pt-1">
        <button
          onClick={save}
          disabled={saving || uploading}
          className="px-5 py-2 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] transition-transform hover:scale-[1.02] disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
        >
          {saving ? "Posting…" : existing ? "Save changes" : "Post it"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)]"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-widest opacity-50" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
