"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Github, Paperclip, Download, Plus, Play, Settings2, Link2 as LinkIcon } from "lucide-react";
import { createClient, withTimeout } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useContentContext } from "@/components/content-provider";
import { Editable } from "@/components/editable-text";
import { RemoveBtn } from "@/components/remove-btn";
import {
  uploadToBucket, formatBytes, downloadUrl, mediaKind, maxBytesForKind,
  PROJECT_FILES_BUCKET, MAX_PROJECT_FILE_BYTES, MAX_MEDIA_ITEMS,
  MAX_MEDIA_IMAGE_BYTES, MAX_MEDIA_VIDEO_BYTES,
  type MediaItem,
} from "@/lib/uploads";
import { videoEmbed } from "@/lib/video-embed";
import {
  SUBMISSION_FIELDS, fieldMode, fieldModeKey, anyFieldOn,
  type FieldId, type FieldMode,
} from "@/lib/submission-fields";

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
  repo_url: string | null;
  media: MediaItem[] | null;
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

// Rows written before `media` existed, or by a client that sent a string,
// must not crash the list.
function readMedia(value: unknown): MediaItem[] {
  const raw = typeof value === "string" ? safeParse(value) : value;
  if (!Array.isArray(raw)) return [];
  const out: MediaItem[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const { url, name, kind } = m as Partial<MediaItem>;
    if (typeof url !== "string" || !url) continue;
    out.push({
      url,
      name: typeof name === "string" ? name : "",
      kind: kind === "video" || kind === "embed" ? kind : "image",
    });
  }
  return out;
}

function safeParse(v: string): unknown {
  try { return JSON.parse(v); } catch { return null; }
}

export function ProjectSubmissions({
  lessonKey,
  courseId,
  canManage,
}: {
  lessonKey: string;
  courseId: string;
  /** Lesson editors: may switch the section on or off, choose which fields are
   *  asked for, and remove any entry. */
  canManage: boolean;
}) {
  const { content, updateContent } = useContentContext();
  const { user, profile } = useAuth();

  const [rows, setRows] = useState<Submission[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
      setRows(((data ?? []) as Submission[]).map((r) => ({ ...r, media: readMedia(r.media) })));
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
  const formUsable = anyFieldOn(content, lessonKey);

  return (
    <div className="mb-14">
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          Solutions
        </p>
        {canManage && (
          <div className="shrink-0 flex items-center gap-2">
            {enabled && (
              <button
                onClick={() => setShowSettings((v) => !v)}
                title="Choose what this project asks for"
                className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] transition-colors"
                style={showSettings
                  ? { color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }
                  : { color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
              >
                <Settings2 size={12} /> Fields
              </button>
            )}
            <button
              onClick={() => updateContent(submissionsEnabledKey(lessonKey), enabled ? "0" : "1")}
              title={enabled ? "Hide the submissions section from this project" : "Let signed-in people post their solution"}
              className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] transition-colors"
              style={enabled
                ? { background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }
                : { color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
            >
              {enabled ? "Submissions on" : "Submissions off"}
            </button>
          </div>
        )}
      </div>

      {!enabled ? (
        <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
          Submissions are off. Turn them on to let anyone with an account post their build.
        </p>
      ) : (
        <>
          {canManage && showSettings && <FieldSettings lessonKey={lessonKey} />}

          <Editable
            as="p"
            contentKey={submissionsIntroKey(lessonKey)}
            fallback="Finished the project? Post it here so other people can see how you approached it, and so you can see how they approached it. Show what you made, and link the work behind it."
            className="text-[14px] leading-relaxed mb-6"
            style={{ color: "var(--text-muted)" }}
          />

          {tableMissing ? (
            <p className="text-[13px]" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
              Submissions are not available right now.
            </p>
          ) : (
            <>
              {formUsable ? (
                <SubmitBox
                  lessonKey={lessonKey}
                  courseId={courseId}
                  existing={mine}
                  signedIn={!!user}
                  hasUsername={!!profile?.username}
                  onSaved={load}
                />
              ) : canManage ? (
                <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                  Every field is switched off, so there is nothing to submit. Turn one back on under Fields.
                </p>
              ) : null}

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
                    <ul className="flex flex-col gap-4">
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

// ── Editor: which fields this project asks for ────────────────────────────────

function FieldSettings({ lessonKey }: { lessonKey: string }) {
  const { content, updateContent } = useContentContext();

  return (
    <div
      className="mb-6 px-5 pt-4 pb-4"
      style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", background: "var(--surface)" }}
    >
      <p className="font-mono text-[9px] uppercase tracking-widest opacity-50 mb-4" style={{ color: "var(--text-muted)" }}>
        What this project asks for
      </p>
      <div className="flex flex-col gap-3">
        {SUBMISSION_FIELDS.map((f) => {
          const mode = fieldMode(content, lessonKey, f.id);
          return (
            <div key={f.id} className="flex items-center justify-between gap-4 flex-wrap">
              <span className="min-w-0">
                <span className="block text-[13px]" style={{ color: "var(--text)" }}>{f.label}</span>
                <span className="block text-[11px] opacity-50" style={{ color: "var(--text-muted)" }}>{f.hint}</span>
              </span>
              <span className="shrink-0 flex items-center gap-1">
                {(["required", "optional", "off"] as FieldMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => updateContent(fieldModeKey(lessonKey, f.id), m)}
                    className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded cursor-pointer transition-colors"
                    style={mode === m
                      ? { color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }
                      : { color: "var(--text-muted)", border: "1px solid var(--border-color)", opacity: 0.7 }}
                  >
                    {m}
                  </button>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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

  const media = readMedia(row.media);
  const repo = normalizeUrl(row.repo_url ?? "");

  return (
    <li
      className="group overflow-hidden"
      style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", background: "var(--surface)", opacity: removing ? 0.4 : 1 }}
    >
      {/* Showcase leads: what people want first is to see the thing. */}
      {media.length > 0 && <MediaGallery items={media} />}

      <div className="flex items-start gap-4 px-4 py-3.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="text-[13.5px]" style={{ color: "var(--text)" }}>
              {row.username || "Someone"}
            </span>
            <span className="font-mono text-[10px] opacity-40" style={{ color: "var(--text-muted)" }}>
              {formatDate(row.created_at)}
            </span>
          </div>

          {(repo || row.file_url) && (
            <div className="flex items-center gap-4 flex-wrap mt-2">
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
          )}

          {row.notes && (
            <p className="text-[13px] leading-relaxed mt-2.5" style={{ color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
              {row.notes}
            </p>
          )}
        </div>

        {canRemove && !removing && <RemoveBtn onClick={remove} title="Remove this submission" />}
      </div>
    </li>
  );
}

function MediaGallery({ items }: { items: MediaItem[] }) {
  const [active, setActive] = useState(0);
  const current = items[Math.min(active, items.length - 1)];

  return (
    <div>
      {/* minHeight so an image that fails to load leaves a frame rather than
          collapsing the card to nothing. */}
      <div className="w-full flex items-center justify-center" style={{ background: "#000", maxHeight: "26rem", minHeight: "9rem" }}>
        {current.kind === "embed" ? (
          <div className="w-full aspect-video">
            <iframe
              key={current.url}
              src={videoEmbed(current.url) ?? ""}
              title={current.name || "Project video"}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : current.kind === "video" ? (
          <video
            key={current.url}
            src={current.url}
            controls
            preload="metadata"
            playsInline
            className="w-full"
            style={{ maxHeight: "26rem" }}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={current.url}
            alt={current.name || "Project screenshot"}
            className="w-full object-contain"
            style={{ maxHeight: "26rem" }}
            loading="lazy"
          />
        )}
      </div>
      {items.length > 1 && (
        <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto" style={{ borderTop: "1px solid var(--border-color)" }}>
          {items.map((m, i) => (
            <button
              key={m.url}
              onClick={() => setActive(i)}
              title={m.name}
              className="relative shrink-0 w-14 h-10 overflow-hidden rounded cursor-pointer"
              style={{ border: i === active ? "1px solid var(--accent-medium)" : "1px solid var(--border-color)", background: "#000" }}
            >
              {m.kind === "image" ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="w-full h-full flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                  {m.kind === "embed" ? <LinkIcon size={12} strokeWidth={1.5} /> : <Play size={13} strokeWidth={1.5} />}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
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
  const { content } = useContentContext();
  const modeOf = (id: FieldId) => fieldMode(content, lessonKey, id);

  const [open, setOpen] = useState(false);
  const [repo, setRepo] = useState("");
  const [notes, setNotes] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [videoLink, setVideoLink] = useState("");
  const [file, setFile] = useState<{ url: string; name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Re-opening the form loads whatever is already posted, so editing is the
  // same flow as posting rather than a second, separate one.
  const openForm = () => {
    setRepo(existing?.repo_url ?? "");
    setNotes(existing?.notes ?? "");
    setMedia(readMedia(existing?.media));
    setVideoLink("");
    setFile(existing?.file_url ? { url: existing.file_url, name: existing.file_name ?? "Attachment", size: 0 } : null);
    setError("");
    setOpen(true);
  };

  if (!signedIn) {
    return (
      <Prompt text="Sign in to share what you built.">
        <Link
          href="/login"
          className="shrink-0 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest rounded-[var(--radius-button)] transition-transform hover:scale-[1.02]"
          style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
        >
          Sign in
        </Link>
      </Prompt>
    );
  }

  if (!hasUsername) {
    return (
      <Prompt text="Pick a username before posting, so your solution has a name on it.">
        <Link
          href="/setup-username"
          className="shrink-0 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest rounded-[var(--radius-button)]"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
        >
          Choose one
        </Link>
      </Prompt>
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

  const addMedia = async (files: FileList) => {
    const room = MAX_MEDIA_ITEMS - media.length;
    if (room <= 0) {
      setError(`You can add up to ${MAX_MEDIA_ITEMS} items.`);
      return;
    }
    setError("");
    setUploading(true);
    const added: MediaItem[] = [];
    try {
      for (const f of Array.from(files).slice(0, room)) {
        const kind = mediaKind(f);
        const cap = maxBytesForKind(kind);
        if (f.size > cap) {
          setError(`${f.name} is ${formatBytes(f.size)}. The limit for a ${kind} is ${formatBytes(cap)}.`);
          continue;
        }
        const up = await uploadToBucket(PROJECT_FILES_BUCKET, f, lessonKey);
        added.push({ url: up.url, name: up.name, kind });
      }
      if (added.length) setMedia((prev) => [...prev, ...added]);
    } catch (err) {
      console.error("[submissions] media upload failed:", err);
      setError("That upload did not go through. Try again, or post without it.");
    } finally {
      setUploading(false);
    }
  };

  // Stored as the original link; the embed URL is rebuilt from the video id at
  // render time, so nothing arbitrary can end up as an iframe src.
  const addVideoLink = () => {
    const raw = videoLink.trim();
    if (!raw) return;
    if (media.length >= MAX_MEDIA_ITEMS) {
      setError(`You can add up to ${MAX_MEDIA_ITEMS} items.`);
      return;
    }
    if (!videoEmbed(raw)) {
      setError("That needs to be a YouTube or Vimeo link. For anything else, upload the clip instead.");
      return;
    }
    if (media.some((m) => m.url === raw)) {
      setError("That link is already on your solution.");
      return;
    }
    setError("");
    setMedia((prev) => [...prev, { url: raw, name: "Video link", kind: "embed" }]);
    setVideoLink("");
  };

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
    // A field only has to be filled in if this project marked it required, and
    // a field switched off is never sent at all. Checked in the order the
    // fields appear, so the complaint points at the first gap you'd see.
    const mediaMode = modeOf("showcase");
    const mediaOut = mediaMode === "off" ? [] : media;
    if (mediaMode === "required" && mediaOut.length === 0) {
      setError("Add at least one screenshot or clip of your project.");
      return;
    }

    const repoMode = modeOf("repo");
    const repoUrl = repoMode === "off" ? null : normalizeUrl(repo);
    if (repoMode === "required" && !repoUrl) {
      setError("Add a link to your repository. It needs to be a full web address.");
      return;
    }
    if (repoMode !== "off" && repo.trim() && !repoUrl) {
      setError("That repository link does not look like a web address.");
      return;
    }

    const fileMode = modeOf("file");
    const fileOut = fileMode === "off" ? null : file;
    if (fileMode === "required" && !fileOut) {
      setError("Attach your project file.");
      return;
    }

    const notesMode = modeOf("notes");
    const notesOut = notesMode === "off" || !notes.trim() ? null : notes.trim().slice(0, 600);
    if (notesMode === "required" && !notesOut) {
      setError("Add a short note about what you made.");
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
            media: mediaOut,
            file_url: fileOut?.url ?? null,
            file_name: fileOut?.name ?? null,
            notes: notesOut,
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

  // Rendered in SUBMISSION_FIELDS order, so showcase leads and the repository
  // link follows it.
  const controls: Record<FieldId, React.ReactNode> = {
    showcase: (
      <div className="flex flex-col gap-2.5">
        {media.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {media.map((m, i) => (
              <span
                key={m.url}
                title={m.name || m.url}
                className="relative w-16 h-12 overflow-hidden rounded"
                style={{ border: "1px solid var(--border-color)", background: "#000" }}
              >
                {m.kind === "image" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                    {m.kind === "embed" ? <LinkIcon size={14} strokeWidth={1.5} /> : <Play size={14} strokeWidth={1.5} />}
                  </span>
                )}
                <button
                  onClick={() => setMedia((prev) => prev.filter((_, j) => j !== i))}
                  title="Remove"
                  className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center text-[10px] cursor-pointer"
                  style={{ background: "#ed4245", color: "#fff", borderBottomLeftRadius: "4px" }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <label
            className="shrink-0 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)]"
            style={{ border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
          >
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => { const fs = e.target.files; if (fs?.length) addMedia(fs); e.target.value = ""; }}
            />
            {uploading ? "Uploading…" : media.length ? "Add more" : "Add images or video"}
          </label>
          <span className="text-[11px] opacity-45" style={{ color: "var(--text-muted)" }}>
            Up to {MAX_MEDIA_ITEMS} items, {formatBytes(MAX_MEDIA_IMAGE_BYTES)} an image, {formatBytes(MAX_MEDIA_VIDEO_BYTES)} a clip
          </span>
        </div>

        {/* A YouTube or Vimeo link instead of an upload, for anyone whose
            recording is longer than the file limit or already posted. */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVideoLink(); } }}
            placeholder="or paste a YouTube or Vimeo link"
            className="flex-1 min-w-[14rem] px-3 py-1.5 text-[12px] outline-none focus:border-[var(--accent-medium)]"
            style={inputStyle}
          />
          <button
            onClick={addVideoLink}
            disabled={!videoLink.trim()}
            className="shrink-0 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] disabled:opacity-30"
            style={{ border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
          >
            Add link
          </button>
        </div>
      </div>
    ),
    repo: (
      <input
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        placeholder="https://github.com/you/your-project"
        className="w-full px-3 py-2 text-[13px] outline-none focus:border-[var(--accent-medium)]"
        style={inputStyle}
      />
    ),
    file: (
      <div className="flex items-center gap-3 flex-wrap">
        <label
          className="shrink-0 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)]"
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
    ),
    notes: (
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value.slice(0, 600))}
        rows={3}
        placeholder="What you made, what you got stuck on, anything you'd do differently."
        className="w-full px-3 py-2 text-[13px] outline-none resize-none focus:border-[var(--accent-medium)]"
        style={inputStyle}
      />
    ),
  };

  return (
    <div
      className="px-5 pt-4 pb-5 flex flex-col gap-3.5"
      style={{ border: "1px solid var(--accent-medium)", borderRadius: "var(--radius-card)", background: "var(--surface)" }}
    >
      {SUBMISSION_FIELDS.map((f) => {
        const mode = modeOf(f.id);
        if (mode === "off") return null;
        return (
          <Field key={f.id} label={f.formLabel} optional={mode === "optional"}>
            {controls[f.id]}
          </Field>
        );
      })}

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

function Prompt({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
      style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)" }}
    >
      <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>{text}</span>
      {children}
    </div>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional: boolean;
  children: React.ReactNode;
}) {
  // A div, not a label: the showcase and file rows nest their own <label> for
  // the hidden file input, and nesting labels makes a click on the heading
  // open the wrong picker.
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-widest opacity-50" style={{ color: "var(--text-muted)" }}>
        {label}{optional ? " (optional)" : ""}
      </span>
      {children}
    </div>
  );
}
