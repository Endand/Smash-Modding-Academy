"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Check, X, ChevronDown, ChevronRight, AlertTriangle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildCourseStructure } from "@/lib/courses/course-structure";
import { getCourseSlug } from "@/lib/courses/course-utils";
import { useContentContext } from "@/components/content-provider";
import { useAuth } from "@/components/auth-provider";
import { canApproveEdits, type EditScope } from "@/hooks/use-permissions";
import {
  type Revision, type RevisionBatch,
  groupIntoBatches, groupBatchesByLesson, describeKey, describeBatch, isStale, isStructuralKey, truncate,
} from "@/lib/revisions";

const SELECT_COLS =
  "id, key, new_value, base_value, course_id, lesson_key, batch_id, label, author_id, status, created_at, reviewed_by, reviewed_at, note";

// Review queue for edits proposed by people without approve rights. Rendered
// only for users who can approve in this scope.
export function PendingChanges({ scope }: { scope: EditScope }) {
  const { liveContent } = useContentContext();
  const { profile } = useAuth();
  const canApprove = canApproveEdits(profile, liveContent, scope);

  const [rows, setRows] = useState<Revision[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const courseId = scope.type === "site" ? null : scope.courseId;
  const lessonKey = scope.type === "lesson" ? scope.lessonKey : null;

  const load = useCallback(async () => {
    if (!canApprove || !courseId) return;
    const supabase = createClient();
    let q = supabase.from("content_revisions").select(SELECT_COLS).eq("status", "pending");
    // On a lesson page review just that lesson; on a course page review the
    // course's own keys plus every lesson inside it.
    q = lessonKey ? q.eq("lesson_key", lessonKey) : q.eq("course_id", courseId);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error || !data) return;
    const list = data as Revision[];
    setRows(list);

    const ids = [...new Set(list.map((r) => r.author_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username").in("id", ids);
      if (profs) {
        setNames(Object.fromEntries((profs as { id: string; username: string }[]).map((p) => [p.id, p.username])));
      }
    }
  }, [canApprove, courseId, lessonKey]);

  useEffect(() => {
    if (!canApprove) return;
    load();

    const supabase = createClient();
    const channel = supabase
      .channel(`review_${lessonKey ?? courseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "content_revisions" }, () => { load(); })
      .subscribe();

    // Realtime is best-effort — it depends on the table being in the
    // supabase_realtime publication, which the migration adds non-fatally. Poll
    // and refetch on focus as well, so a proposal always turns up promptly
    // instead of waiting for the reviewer to reload the page.
    const poll = setInterval(load, 10_000);
    const onWake = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [canApprove, load, lessonKey, courseId]);

  const review = async (revs: Revision[], accept: boolean) => {
    if (busy || revs.length === 0) return;
    setBusy(true);
    const supabase = createClient();
    const now = new Date().toISOString();
    try {
      if (accept) {
        // Publish first, then mark reviewed — if the second call fails the
        // change is live and still queued, which a re-approve resolves. The
        // reverse order could mark it approved while it never went live.
        const { error: wErr } = await supabase.from("site_content").upsert(
          revs.map((r) => ({ key: r.key, value: r.new_value, updated_at: now, updated_by: profile?.id ?? null })),
          { onConflict: "key" }
        );
        if (wErr) throw wErr;
      }
      const { error: sErr } = await supabase
        .from("content_revisions")
        .update({ status: accept ? "approved" : "rejected", reviewed_by: profile?.id ?? null, reviewed_at: now })
        .in("id", revs.map((r) => r.id));
      if (sErr) throw sErr;
      await load();
    } catch (err) {
      console.error("[review] failed:", err);
    } finally {
      setBusy(false);
    }
  };

  if (!canApprove || rows.length === 0) return null;
  const batches = groupIntoBatches(rows);
  // On a lesson page everything already belongs to that lesson, so skip the
  // extra layer; on a course page cluster by lesson and label each one.
  const groups = lessonKey ? null : groupBatchesByLesson(batches);

  const renderBatch = (b: RevisionBatch) => (
    <BatchCard
      key={b.batchId}
      batch={b}
      author={names[b.authorId] ?? "someone"}
      liveContent={liveContent}
      busy={busy}
      expanded={!!expanded[b.batchId]}
      onToggle={() => setExpanded((p) => ({ ...p, [b.batchId]: !p[b.batchId] }))}
      onReview={review}
    />
  );

  return (
    <div
      className="mb-10 rounded-[var(--radius-card)] overflow-hidden"
      style={{ border: "1px solid #f0b232", background: "var(--surface)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 cursor-pointer font-mono text-[10px] uppercase tracking-widest"
        style={{ color: "#f0b232" }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {rows.length} change{rows.length === 1 ? "" : "s"} awaiting review
        <span className="ml-auto opacity-60">
          {groups
            ? `${groups.length} lesson${groups.length === 1 ? "" : "s"}`
            : `${batches.length} edit${batches.length === 1 ? "" : "s"}`}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4">
          {groups
            ? groups.map((g) => (
                <div key={g.lessonKey ?? "__course__"} className="flex flex-col gap-2">
                  <LessonGroupHeader
                    lessonKey={g.lessonKey}
                    count={g.count}
                    edits={g.batches.length}
                    courseId={courseId!}
                  />
                  {g.batches.map(renderBatch)}
                </div>
              ))
            : batches.map(renderBatch)}
        </div>
      )}
    </div>
  );
}

// Names the lesson a cluster of changes belongs to, and links straight to it.
function LessonGroupHeader({
  lessonKey, count, edits, courseId,
}: {
  lessonKey: string | null;
  count: number;
  edits: number;
  courseId: string;
}) {
  const { liveContent } = useContentContext();

  // Structure and slugs come from live content — the router resolves URLs
  // against the database, so an unapproved slug must not be used here.
  const lesson = lessonKey
    ? buildCourseStructure(courseId, liveContent).allLessons.find((l) => l.lessonKey === lessonKey)
    : null;
  const title = lessonKey
    ? (liveContent[`${lessonKey}_title`] ?? lesson?.titleFallback ?? "Untitled lesson")
    : "Course page";
  const courseSlug = getCourseSlug(courseId, liveContent);

  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="font-mono text-[9px] uppercase tracking-widest truncate" style={{ color: "var(--text)" }}>
        {title}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-widest shrink-0 opacity-50" style={{ color: "var(--text-muted)" }}>
        {count} change{count === 1 ? "" : "s"} · {edits} edit{edits === 1 ? "" : "s"}
      </span>
      <div className="flex-1 h-px min-w-4" style={{ background: "var(--border-color)" }} />
      {lesson && (
        <Link
          href={`/courses/${courseSlug}/${lesson.slug}`}
          className="shrink-0 flex items-center gap-1 px-2 py-1 font-mono text-[9px] uppercase tracking-widest rounded-[var(--radius-button)] transition-colors hover:brightness-125"
          style={{ color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }}
        >
          Open lesson <ArrowRight size={9} />
        </Link>
      )}
    </div>
  );
}

function BatchCard({
  batch, author, liveContent, busy, expanded, onToggle, onReview,
}: {
  batch: RevisionBatch;
  author: string;
  liveContent: Record<string, string>;
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  onReview: (revs: Revision[], accept: boolean) => void;
}) {
  const stale = batch.revisions.some((r) => isStale(r, liveContent));
  const when = new Date(batch.createdAt).toLocaleString();

  return (
    <div className="rounded-[var(--radius-card)]" style={{ border: "1px solid var(--border-color)", background: "var(--bg)" }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer text-left">
          {expanded ? <ChevronDown size={11} className="shrink-0" /> : <ChevronRight size={11} className="shrink-0" />}
          <span className="text-[13px] truncate" style={{ color: "var(--text)" }}>{describeBatch(batch)}</span>
          <span className="font-mono text-[9px] uppercase tracking-widest shrink-0 opacity-60" style={{ color: "var(--text-muted)" }}>
            @{author}
          </span>
        </button>
        {stale && (
          <span title="The live version changed after this was proposed. Approving overwrites it" className="shrink-0 flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest" style={{ color: "#f0b232" }}>
            <AlertTriangle size={10} /> Stale
          </span>
        )}
        <button
          onClick={() => onReview(batch.revisions, true)}
          disabled={busy}
          title="Approve all changes in this edit"
          className="shrink-0 flex items-center gap-1 px-2 py-1 font-mono text-[9px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] disabled:opacity-40"
          style={{ background: "#3ba55d", color: "#fff", border: "1px solid #3ba55d" }}
        >
          <Check size={10} strokeWidth={3} /> Approve
        </button>
        <button
          onClick={() => onReview(batch.revisions, false)}
          disabled={busy}
          title="Reject all changes in this edit"
          className="shrink-0 flex items-center gap-1 px-2 py-1 font-mono text-[9px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] disabled:opacity-40"
          style={{ color: "#ed4245", border: "1px solid #ed4245" }}
        >
          <X size={10} strokeWidth={3} /> Reject
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border-color)" }}>
          <p className="font-mono text-[9px] uppercase tracking-widest opacity-40 pt-2" style={{ color: "var(--text-muted)" }}>
            {when}
          </p>
          {batch.revisions.map((r) => (
            <RevisionRow key={r.id} rev={r} liveContent={liveContent} busy={busy} onReview={onReview} />
          ))}
        </div>
      )}
    </div>
  );
}

function RevisionRow({
  rev, liveContent, busy, onReview,
}: {
  rev: Revision;
  liveContent: Record<string, string>;
  busy: boolean;
  onReview: (revs: Revision[], accept: boolean) => void;
}) {
  const structural = isStructuralKey(rev.key);
  const before = liveContent[rev.key] ?? null;
  const stale = isStale(rev, liveContent);

  return (
    <div className="flex items-start gap-2 text-[12px]" style={{ opacity: structural ? 0.55 : 1 }}>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[9px] uppercase tracking-widest mb-1 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          {rev.label || describeKey(rev.key)}
          {stale && <AlertTriangle size={9} style={{ color: "#f0b232" }} />}
        </div>
        <div className="line-through break-words" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
          {truncate(before)}
        </div>
        <div className="break-words" style={{ color: "var(--text)" }}>
          {truncate(rev.new_value)}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onReview([rev], true)}
          disabled={busy}
          title="Approve just this change"
          className="w-5 h-5 rounded flex items-center justify-center cursor-pointer disabled:opacity-40"
          style={{ border: "1px solid #3ba55d", color: "#3ba55d" }}
        >
          <Check size={10} strokeWidth={3} />
        </button>
        <button
          onClick={() => onReview([rev], false)}
          disabled={busy}
          title="Reject just this change"
          className="w-5 h-5 rounded flex items-center justify-center cursor-pointer disabled:opacity-40"
          style={{ border: "1px solid #ed4245", color: "#ed4245" }}
        >
          <X size={10} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
