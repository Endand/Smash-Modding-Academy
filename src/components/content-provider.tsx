"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createClient, withTimeout } from "@/lib/supabase/client";
import { computeSlugSync } from "@/lib/courses/slug-sync";
import { useAuth } from "@/components/auth-provider";
import type { Revision } from "@/lib/revisions";

type ContentMap = Record<string, string>;

// Where a proposed change belongs, so reviewers can find it. Kept structural
// rather than importing EditScope, so this provider stays independent of the
// permission layer that sits below it.
export interface ProposeScope {
  courseId: string | null;
  lessonKey: string | null;
}

export interface PendingEdit {
  key: string;
  value: string;
  baseValue: string | null;
}

// Keys that decide URLs. These are proposed and applied on approval like any
// other change, but they are deliberately left OUT of the local overlay: the
// router resolves slugs against the database, so showing an unpublished slug
// to its author would send them to a page that doesn't exist yet. Renaming a
// lesson title queues the matching slug change — it just doesn't move the URL
// under the editor's feet before anyone has approved it.
function isRoutingKey(key: string): boolean {
  return /_slug$/.test(key) || /_slug_map$/.test(key);
}

interface ContentContextValue {
  /** Live content with the viewer's own pending edits overlaid. */
  content: ContentMap;
  /** Live content only — what the public sees, and what diffs compare against. */
  liveContent: ContentMap;
  /** Writes straight to site_content. RevisionGate swaps this for proposeChange. */
  updateContent: (key: string, value: string) => Promise<void>;
  /** Queues a change for approval instead of publishing it. */
  proposeChange: (key: string, value: string, scope: ProposeScope) => Promise<void>;
  /** The viewer's own pending edits, by content key. */
  pending: Record<string, PendingEdit>;
}

export const ContentContext = createContext<ContentContextValue>({
  content: {},
  liveContent: {},
  updateContent: async () => {},
  proposeChange: async () => {},
  pending: {},
});

export function useContentContext(): ContentContextValue {
  return useContext(ContentContext);
}

interface ContentProviderProps {
  children: React.ReactNode;
  initialContent: Record<string, string>;
}

export function ContentProvider({ children, initialContent }: ContentProviderProps) {
  // Initialised from server-fetched data — no loading flash or fallback flicker.
  const [liveContent, setLiveContent] = useState<ContentMap>(initialContent);
  // Surfaced to the user when a write fails, so silent data loss can't happen
  // unnoticed (the UI shows the optimistic edit even if the save didn't land).
  const [saveFailed, setSaveFailed] = useState(false);
  // The viewer's own not-yet-approved edits, overlaid so their work is visible
  // to them while it waits for review. Never shown to anyone else.
  const [pendingRows, setPendingRows] = useState<Record<string, PendingEdit>>({});

  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Fresh snapshots for the stable callbacks below — used by slug sync and to
  // stamp proposals with their author without an extra auth round trip.
  const contentRef = useRef<ContentMap>(initialContent);
  useEffect(() => { contentRef.current = liveContent; }, [liveContent]);
  const userIdRef = useRef<string | null>(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  useEffect(() => {
    const supabase = createClient();

    // No initial client-side load needed — data came from the server.
    // Subscribe to real-time so admin edits propagate instantly to all clients.
    const channel = supabase
      .channel("site_content_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_content" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const { key, value } = payload.new as { key: string; value: string };
            setLiveContent((prev) => ({ ...prev, [key]: value }));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load (and keep in sync) this user's own pending proposals. When one is
  // approved or rejected it stops being pending, the overlay drops it, and the
  // live value — now updated, or unchanged — shows through.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = createClient();

    const load = async () => {
      const { data, error } = await supabase
        .from("content_revisions")
        .select("key, new_value, base_value")
        .eq("author_id", userId)
        .eq("status", "pending");
      if (cancelled || error || !data) return;
      const map: Record<string, PendingEdit> = {};
      for (const r of data as { key: string; new_value: string; base_value: string | null }[]) {
        map[r.key] = { key: r.key, value: r.new_value, baseValue: r.base_value };
      }
      setPendingRows(map);
    };
    load();

    const channel = supabase
      .channel(`content_revisions_${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "content_revisions", filter: `author_id=eq.${userId}` },
        () => { load(); }
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [userId]);

  // Signed-out viewers never carry an overlay, even if stale state lingers.
  const pending = useMemo(() => (userId ? pendingRows : {}), [userId, pendingRows]);

  const content = useMemo(() => {
    const keys = Object.keys(pending).filter((k) => !isRoutingKey(k));
    if (keys.length === 0) return liveContent;
    const merged = { ...liveContent };
    for (const k of keys) merged[k] = pending[k].value;
    return merged;
  }, [liveContent, pending]);

  const updateContent = useCallback(async (key: string, value: string) => {
    const supabase = createClient();

    // Title edits also sync the matching course/lesson URL slug
    const writes: [string, string][] = [
      [key, value],
      ...computeSlugSync(key, value, contentRef.current),
    ];

    setLiveContent((prev) => {
      const next = { ...prev };
      for (const [k, v] of writes) next[k] = v;
      return next;
    });

    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const { error } = await withTimeout(
        supabase.from("site_content").upsert(
          writes.map(([k, v]) => ({ key: k, value: v, updated_at: now, updated_by: u?.id ?? null })),
          { onConflict: "key" }
        )
      );
      if (error) throw error;
      setSaveFailed(false);
    } catch (err) {
      console.error("[content] save failed:", err);
      setSaveFailed(true);
    }
  }, []);

  // ── Proposals ──────────────────────────────────────────────────────────────
  // Every updateContent call inside one click lands in the same microtask, so
  // buffering until the microtask drains groups a multi-key action (adding a
  // block writes content + type + count) under one batch_id. A reviewer then
  // approves or rejects it whole, and can't half-apply a structural change.
  const buffer = useRef<Map<string, { value: string; base: string | null }>>(new Map());
  const bufferScope = useRef<ProposeScope>({ courseId: null, lessonKey: null });
  const flushQueued = useRef(false);

  const flushProposals = useCallback(async () => {
    const entries = [...buffer.current.entries()];
    const scope = bufferScope.current;
    buffer.current.clear();
    if (entries.length === 0) return;

    const supabase = createClient();
    try {
      const authorId = userIdRef.current;
      if (!authorId) throw new Error("not signed in");
      const batchId = crypto.randomUUID();
      const keys = entries.map(([k]) => k);

      // Re-editing a field supersedes the earlier proposal rather than queueing
      // every intermediate state. (Delete-then-insert: the uniqueness rule is a
      // partial index, which PostgREST's upsert can't target.)
      const { error: delErr } = await withTimeout(
        supabase.from("content_revisions")
          .delete()
          .eq("author_id", authorId)
          .eq("status", "pending")
          .in("key", keys)
      );
      if (delErr) throw delErr;

      const { error: insErr } = await withTimeout(
        supabase.from("content_revisions").insert(
          entries.map(([k, v]) => ({
            key: k,
            new_value: v.value,
            base_value: v.base,
            course_id: scope.courseId,
            lesson_key: scope.lessonKey,
            batch_id: batchId,
            author_id: authorId,
          }))
        )
      );
      if (insErr) throw insErr;
      setSaveFailed(false);
    } catch (err) {
      console.error("[content] proposal failed:", err);
      setSaveFailed(true);
    }
  }, []);

  const proposeChange = useCallback(async (key: string, value: string, scope: ProposeScope) => {
    // Slug sync applies to proposals too, so an approved title rename carries
    // its URL change with it instead of leaving the two out of step.
    const writes: [string, string][] = [
      [key, value],
      ...computeSlugSync(key, value, contentRef.current),
    ];

    // Show the editor their own change immediately — waiting on a round trip
    // (or on review) would make editing feel broken.
    setPendingRows((prev) => {
      const next = { ...prev };
      for (const [k, v] of writes) {
        next[k] = { key: k, value: v, baseValue: contentRef.current[k] ?? null };
      }
      return next;
    });

    for (const [k, v] of writes) {
      buffer.current.set(k, { value: v, base: contentRef.current[k] ?? null });
    }
    bufferScope.current = scope;

    if (!flushQueued.current) {
      flushQueued.current = true;
      queueMicrotask(() => {
        flushQueued.current = false;
        flushProposals();
      });
    }
  }, [flushProposals]);

  const value = useMemo(
    () => ({ content, liveContent, updateContent, proposeChange, pending }),
    [content, liveContent, updateContent, proposeChange, pending]
  );

  return (
    <ContentContext.Provider value={value}>
      {children}
      {saveFailed && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-card)] shadow-lg"
          style={{ background: "#ed4245", color: "#fff", maxWidth: "90vw" }}
          role="alert"
        >
          <span className="text-[13px]">A change couldn&apos;t be saved — check your connection, then re-edit to retry.</span>
          <button
            onClick={() => setSaveFailed(false)}
            className="shrink-0 font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded cursor-pointer"
            style={{ border: "1px solid rgba(255,255,255,0.5)" }}
          >
            Dismiss
          </button>
        </div>
      )}
    </ContentContext.Provider>
  );
}

export type { Revision };
